import { QPTool, ToolExecutionContext } from "../types";

/**
 * A tool that allows the AI to look up validated ontology terms from
 * UBERON (anatomy), DOID (diseases), Cognitive Atlas (cognitive concepts),
 * and other biomedical ontologies using the EBI Ontology Lookup Service (OLS)
 * and the Cognitive Atlas API.
 */

// Ontology configurations with their OLS identifiers and DANDI schemaKey mappings
const OLS_ONTOLOGY_CONFIG: Record<
  string,
  { olsId: string; schemaKey: "Anatomy" | "Disorder" | "GenericType"; description: string }
> = {
  UBERON: {
    olsId: "uberon",
    schemaKey: "Anatomy",
    description: "Ubiquitous Anatomical Ontology - for anatomical structures",
  },
  DOID: {
    olsId: "doid",
    schemaKey: "Disorder",
    description: "Human Disease Ontology - for diseases and disorders",
  },
  NCIT: {
    olsId: "ncit",
    schemaKey: "Disorder",
    description: "NCI Thesaurus - for diseases, anatomy, and other biomedical concepts",
  },
  HP: {
    olsId: "hp",
    schemaKey: "Disorder",
    description: "Human Phenotype Ontology - for phenotypic abnormalities",
  },
  GO: {
    olsId: "go",
    schemaKey: "GenericType",
    description: "Gene Ontology - for molecular functions, biological processes, and cellular components",
  },
  CL: {
    olsId: "cl",
    schemaKey: "Anatomy",
    description: "Cell Ontology - for cell types",
  },
};

interface OLSSearchResult {
  iri: string;
  label: string;
  description?: string[];
  ontology_name: string;
  obo_id?: string;
  short_form?: string;
}

interface OLSResponse {
  response: {
    numFound: number;
    docs: OLSSearchResult[];
  };
}

interface CognitiveAtlasResult {
  id: string;
  name: string;
  definition_text?: string;
}

interface FormattedResult {
  identifier: string;
  name: string;
  schemaKey: "Anatomy" | "Disorder" | "GenericType";
  ontology: string;
  description?: string;
  oboId?: string;
}

export const lookupOntologyTermTool: QPTool = {
  toolFunction: {
    name: "lookup_ontology_term",
    description:
      "Look up validated ontology terms for brain regions, anatomical structures, diseases, disorders, or cognitive concepts. Returns standardized identifiers (URIs) that can be used with propose_metadata_change to add entries to the 'about' field.",
    parameters: {
      type: "object",
      properties: {
        term: {
          type: "string",
          description:
            "The term to search for (e.g., 'hippocampus', 'Parkinson disease', 'working memory', 'attention')",
        },
        category: {
          type: "string",
          enum: ["anatomy", "disorder", "cognitive", "auto"],
          description:
            "The category to search in: 'anatomy' for brain regions and anatomical structures (searches UBERON, CL), 'disorder' for diseases and conditions (searches DOID, HP, NCIT), 'cognitive' for cognitive concepts and mental processes (searches Cognitive Atlas), or 'auto' to search all and return the best matches. Default is 'auto'.",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results to return (1-10). Default is 5.",
        },
      },
      required: ["term"],
    },
  },

  execute: async (
    params: { term: string; category?: string; maxResults?: number },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: ToolExecutionContext
  ) => {
    const { term, category = "auto", maxResults = 5 } = params;

    if (!term || term.trim().length === 0) {
      return {
        result: JSON.stringify({
          success: false,
          error: "Please provide a search term.",
        }),
      };
    }

    const clampedMaxResults = Math.min(Math.max(1, maxResults), 10);

    // Determine which ontologies to search based on category
    let olsOntologiesToSearch: string[];
    let searchCognitiveAtlas = false;

    if (category === "anatomy") {
      olsOntologiesToSearch = ["UBERON", "CL"];
    } else if (category === "disorder") {
      olsOntologiesToSearch = ["DOID", "HP", "NCIT"];
    } else if (category === "cognitive") {
      olsOntologiesToSearch = [];
      searchCognitiveAtlas = true;
    } else {
      // auto - search all
      olsOntologiesToSearch = ["UBERON", "DOID", "HP", "CL"];
      searchCognitiveAtlas = true;
    }

    try {
      const allResults: FormattedResult[] = [];

      // Search OLS ontologies
      for (const ontology of olsOntologiesToSearch) {
        const config = OLS_ONTOLOGY_CONFIG[ontology];
        if (!config) continue;

        try {
          const results = await searchOLS(term, config.olsId, clampedMaxResults);

          for (const result of results) {
            allResults.push({
              identifier: result.iri,
              name: result.label,
              schemaKey: config.schemaKey,
              ontology: ontology,
              description: result.description?.[0],
              oboId: result.obo_id,
            });
          }
        } catch (error) {
          // Continue with other ontologies if one fails
          console.error(`Error searching ${ontology}:`, error);
        }
      }

      // Search Cognitive Atlas
      if (searchCognitiveAtlas) {
        try {
          const cogAtlasResults = await searchCognitiveAtlas_API(term, clampedMaxResults);
          for (const result of cogAtlasResults) {
            allResults.push({
              identifier: `https://www.cognitiveatlas.org/concept/id/${result.id}`,
              name: result.name,
              schemaKey: "GenericType",
              ontology: "CognitiveAtlas",
              description: result.definition_text,
            });
          }
        } catch (error) {
          console.error("Error searching Cognitive Atlas:", error);
        }
      }

      if (allResults.length === 0) {
        return {
          result: JSON.stringify({
            success: true,
            term,
            category,
            results: [],
            message: `No matching terms found for "${term}". Try different search terms or check spelling.`,
          }),
        };
      }

      // Sort by relevance (exact matches first, then by label length as a rough proxy)
      allResults.sort((a, b) => {
        const termLower = term.toLowerCase();
        const aExact = a.name.toLowerCase() === termLower;
        const bExact = b.name.toLowerCase() === termLower;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = a.name.toLowerCase().startsWith(termLower);
        const bStarts = b.name.toLowerCase().startsWith(termLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return a.name.length - b.name.length;
      });

      // Limit results
      const limitedResults = allResults.slice(0, clampedMaxResults);

      return {
        result: JSON.stringify({
          success: true,
          term,
          category,
          resultsCount: limitedResults.length,
          totalFound: allResults.length,
          results: limitedResults,
          usage: `To add a term to the dandiset metadata, use propose_metadata_change with:
- path: "about.${"{next_index}"}" (use the next available index in the about array)
- newValue: { "schemaKey": "${limitedResults[0]?.schemaKey}", "identifier": "${limitedResults[0]?.identifier}", "name": "${limitedResults[0]?.name}" }`,
        }),
      };
    } catch (error) {
      return {
        result: JSON.stringify({
          success: false,
          error: `Error searching ontologies: ${error instanceof Error ? error.message : "Unknown error"}`,
          hint: "The OLS API might be temporarily unavailable. Please try again later.",
        }),
      };
    }
  },

  getDetailedDescription: () => {
    return `Use this tool to look up validated ontology terms when users mention brain regions, anatomical structures, diseases, disorders, or cognitive concepts.

**IMPORTANT: Always use this tool to get the correct ontology identifier before proposing changes to the 'about' field. Never guess or fabricate ontology identifiers.**

**Usage:**
- Search for a term (e.g., "hippocampus", "Parkinson disease", "working memory")
- Optionally specify a category: "anatomy", "disorder", or "cognitive"
- The tool returns validated identifiers that conform to the DANDI schema

**Ontologies searched:**
- **Anatomy**: UBERON (anatomical structures), CL (cell types)
- **Disorder**: DOID (diseases), HP (phenotypes), NCIT (NCI thesaurus)
- **Cognitive**: Cognitive Atlas (cognitive concepts, mental processes, psychological constructs)

**Examples:**
- Look up a brain region: { "term": "hippocampus", "category": "anatomy" }
- Look up a disease: { "term": "Parkinson", "category": "disorder" }
- Look up a cognitive concept: { "term": "working memory", "category": "cognitive" }
- Auto-detect category: { "term": "epilepsy" }

**Workflow:**
1. User mentions a brain area, disease, or cognitive concept
2. Use this tool to find the validated ontology term
3. Present options to the user if multiple matches exist
4. Use propose_metadata_change to add the selected term to the "about" array

**Result format:**
Each result includes:
- identifier: The URI to use in propose_metadata_change
- name: Human-readable label
- schemaKey: "Anatomy", "Disorder", or "GenericType" (determines the type for the about field)
- ontology: Source ontology (UBERON, DOID, CognitiveAtlas, etc.)
- description: Optional definition of the term`;
  },
};

/**
 * Search the EBI Ontology Lookup Service for terms
 */
async function searchOLS(
  term: string,
  ontologyId: string,
  maxResults: number
): Promise<OLSSearchResult[]> {
  const baseUrl = "https://www.ebi.ac.uk/ols4/api/search";
  const params = new URLSearchParams({
    q: term,
    ontology: ontologyId,
    rows: String(maxResults),
    exact: "false",
    queryFields: "label,synonym",
  });

  const response = await fetch(`${baseUrl}?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`OLS API returned ${response.status}: ${response.statusText}`);
  }

  const data: OLSResponse = await response.json();
  return data.response?.docs || [];
}

/**
 * Search the Cognitive Atlas API for cognitive concepts
 */
async function searchCognitiveAtlas_API(
  term: string,
  maxResults: number
): Promise<CognitiveAtlasResult[]> {
  const baseUrl = "https://www.cognitiveatlas.org/api/v-alpha/concept";
  const params = new URLSearchParams({
    search: term,
  });

  const response = await fetch(`${baseUrl}?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Cognitive Atlas API returned ${response.status}: ${response.statusText}`);
  }

  const data: CognitiveAtlasResult[] = await response.json();

  // The API returns all concepts - filter by search term and limit results
  const termLower = term.toLowerCase();
  const filtered = data
    .filter((item) =>
      item.name.toLowerCase().includes(termLower) ||
      item.definition_text?.toLowerCase().includes(termLower)
    )
    .slice(0, maxResults);

  return filtered;
}
