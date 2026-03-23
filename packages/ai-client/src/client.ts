import Anthropic from "@anthropic-ai/sdk";
import pLimit, { type LimitFunction } from "p-limit";

export interface SendMessageParams {
  model: string;
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: any }>;
  maxTokens?: number;
  temperature?: number;
}

export interface SendVisionParams {
  images: Array<{ data: string; mediaType: string }>;
  prompt: string;
  model?: string;
  maxTokens?: number;
}

export interface SendWithJsonOutputParams {
  model: string;
  system?: string;
  prompt: string;
  maxTokens?: number;
}

export class ClaudeClient {
  private anthropic: Anthropic;
  private limiter: LimitFunction;

  constructor(apiKey?: string, maxConcurrent: number = 50) {
    this.anthropic = new Anthropic({
      apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
    });
    this.limiter = pLimit(maxConcurrent);
  }

  async sendMessage(
    params: SendMessageParams
  ): Promise<Anthropic.Messages.Message> {
    return this.limiter(() =>
      this.anthropic.messages.create({
        model: params.model,
        max_tokens: params.maxTokens ?? 4096,
        temperature: params.temperature,
        system: params.system,
        messages: params.messages,
      })
    );
  }

  async sendVision(
    params: SendVisionParams
  ): Promise<Anthropic.Messages.Message> {
    const contentBlocks: Anthropic.Messages.ContentBlockParam[] = [];

    for (const image of params.images) {
      contentBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
          data: image.data,
        },
      });
    }

    contentBlocks.push({
      type: "text",
      text: params.prompt,
    });

    return this.limiter(() =>
      this.anthropic.messages.create({
        model: params.model ?? "claude-sonnet-4-20250514",
        max_tokens: params.maxTokens ?? 8192,
        messages: [
          {
            role: "user",
            content: contentBlocks,
          },
        ],
      })
    );
  }

  async sendWithJsonOutput<T>(params: SendWithJsonOutputParams): Promise<T> {
    const response = await this.sendMessage({
      model: params.model,
      system: params.system,
      messages: [{ role: "user", content: params.prompt }],
      maxTokens: params.maxTokens ?? 8192,
    });

    const text = this.getTextContent(response);

    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

    return JSON.parse(jsonStr) as T;
  }

  getTextContent(response: Anthropic.Messages.Message): string {
    const textBlock = response.content.find(
      (block): block is Anthropic.Messages.TextBlock => block.type === "text"
    );
    return textBlock?.text ?? "";
  }
}
