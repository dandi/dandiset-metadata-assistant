/**
 * Export tools in react-ai-chat compatible format
 * 
 * The internal tools use QPTool with ToolExecutionContext.
 * The react-ai-chat package uses Tool with ToolContext.
 * We cast the context to ToolExecutionContext since we know
 * the DandisetChatPanel provides the correct properties.
 */

import type { Tool, ToolContext } from "react-ai-chat";
import type { ToolExecutionContext } from "../types";
import { proposeMetadataChangeTool } from "./proposeMetadataChange";
import { fetchUrlTool } from "./fetchUrl";
import { lookupOntologyTermTool } from "./lookupOntologyTerm";

// Cast ToolContext to ToolExecutionContext since we know
// DandisetChatPanel provides the required properties

export const proposeMetadataChange: Tool = {
  toolFunction: proposeMetadataChangeTool.toolFunction,
  execute: async (params: unknown, context: ToolContext) => {
    return proposeMetadataChangeTool.execute(params, context as unknown as ToolExecutionContext);
  },
  getDetailedDescription: proposeMetadataChangeTool.getDetailedDescription,
};

export const fetchUrl: Tool = {
  toolFunction: fetchUrlTool.toolFunction,
  execute: async (params: unknown, context: ToolContext) => {
    return fetchUrlTool.execute(params, context as unknown as ToolExecutionContext);
  },
  getDetailedDescription: fetchUrlTool.getDetailedDescription,
};

export const lookupOntologyTerm: Tool = {
  toolFunction: lookupOntologyTermTool.toolFunction,
  execute: async (params: unknown, context: ToolContext) => {
    return lookupOntologyTermTool.execute(params, context as unknown as ToolExecutionContext);
  },
  getDetailedDescription: lookupOntologyTermTool.getDetailedDescription,
};

/**
 * All available tools for the chat
 */
export const dandisetTools: Tool[] = [
  proposeMetadataChange,
  fetchUrl,
  lookupOntologyTerm,
];
