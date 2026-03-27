import { type AIProviderType } from "@/config/ai";
import {
  type AICompletionOptions,
  type AICompletionResult,
  type AIModelConfig,
  type AIProvider,
  type AIStreamPart,
} from "../types";

const MOCK_DELAY = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateMockOutline(
  topic: string,
  slideCount: number,
  language: string = "en",
): string[] {
  const templates: Record<string, string[]> = {
    en: [
      `Introduction to ${topic}`,
      `What is ${topic}?`,
      `Key Benefits of ${topic}`,
      `How ${topic} Works`,
      `Use Cases and Applications`,
      `Getting Started with ${topic}`,
      `Best Practices`,
      `Common Challenges`,
      `Future of ${topic}`,
      `Summary and Takeaways`,
    ],
    es: [
      `Introducción a ${topic}`,
      `¿Qué es ${topic}?`,
      `Beneficios clave de ${topic}`,
      `Cómo funciona ${topic}`,
      `Casos de uso y aplicaciones`,
      `Comenzando con ${topic}`,
      `Mejores prácticas`,
      `Desafíos comunes`,
      `El futuro de ${topic}`,
      `Resumen y conclusiones`,
    ],
    fr: [
      `Introduction à ${topic}`,
      `Qu'est-ce que ${topic}?`,
      `Avantages clés de ${topic}`,
      `Comment fonctionne ${topic}`,
      `Cas d'utilisation et applications`,
      `Premiers pas avec ${topic}`,
      `Meilleures pratiques`,
      `Défis courants`,
      `L'avenir de ${topic}`,
      `Résumé et conclusions`,
    ],
    de: [
      `Einführung in ${topic}`,
      `Was ist ${topic}?`,
      `Hauptvorteile von ${topic}`,
      `Wie ${topic} funktioniert`,
      `Anwendungsfälle und Anwendungen`,
      `Erste Schritte mit ${topic}`,
      `Best Practices`,
      `Häufige Herausforderungen`,
      `Zukunft von ${topic}`,
      `Zusammenfassung und Erkenntnisse`,
    ],
    zh: [
      `${topic}简介`,
      `什么是${topic}？`,
      `${topic}的主要优势`,
      `${topic}的工作原理`,
      `应用场景`,
      `${topic}入门`,
      `最佳实践`,
      `常见挑战`,
      `${topic}的未来`,
      `总结与要点`,
    ],
  };

  const lang = language.startsWith("es")
    ? "es"
    : language.startsWith("fr")
      ? "fr"
      : language.startsWith("de")
        ? "de"
        : language.startsWith("zh")
          ? "zh"
          : "en";
  const baseOutline = templates[lang] || templates.en || [];

  if (baseOutline.length === 0) {
    return Array.from(
      { length: slideCount },
      (_, i) => `Slide ${i + 1}: ${topic}`,
    );
  }

  if (slideCount <= baseOutline.length) {
    return baseOutline.slice(0, slideCount);
  }

  const extendedOutline = [...baseOutline];
  while (extendedOutline.length < slideCount) {
    extendedOutline.push(`${extendedOutline.length + 1}. Additional Content`);
  }
  return extendedOutline;
}

function generateMockSlideContent(slideTitle: string, topic: string): string {
  return `<SECTION layout="vertical" theme="mystique">
  <H1>${slideTitle}</H1>
  <COLUMNS count="2">
    <COLUMN>
      <BULLETS>
        <LI>Key insight about ${topic}</LI>
        <LI>Important consideration for implementation</LI>
        <LI>Best practice recommendation</LI>
      </BULLETS>
    </COLUMN>
    <COLUMN>
      <IMG query="professional ${topic} illustration" />
    </COLUMN>
  </COLUMNS>
</SECTION>`;
}

const mockDefaultModel: AIModelConfig = {
  id: "mock",
  name: "Mock (Development)",
  provider: "mock",
  maxTokens: 10000,
  supportsStreaming: true,
  description: "Mock responses for development without API keys",
};

export class MockProvider implements AIProvider {
  type: AIProviderType = "mock";
  isAvailable: boolean = true;

  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    await delay(MOCK_DELAY);

    const lastMessage =
      options.messages[options.messages.length - 1]?.content || "";
    const lowerMessage = lastMessage.toLowerCase();

    if (
      lowerMessage.includes("outline") ||
      lowerMessage.includes("structure")
    ) {
      const topicMatch =
        lastMessage.match(/topic[:\s]+["']?([^"'\n]+)/i) ||
        lastMessage.match(/subject[:\s]+["']?([^"'\n]+)/i);
      const countMatch = lastMessage.match(/(\d+)\s*(?:slide|section)/i);
      const langMatch = lastMessage.match(/language[:\s]+["']?(\w+)/i);

      const topic = topicMatch?.[1]?.trim() || "this topic";
      const count = countMatch ? parseInt(countMatch[1] || "5") : 5;
      const lang = langMatch?.[1] || "en";

      const outline = generateMockOutline(topic, count, lang);
      return {
        text: JSON.stringify({ outline }),
        finishReason: "stop",
      };
    }

    if (lowerMessage.includes("slide") && lowerMessage.includes("content")) {
      const titleMatch = lastMessage.match(/title[:\s]+["']?([^"'\n]+)/i);
      const topicMatch = lastMessage.match(/topic[:\s]+["']?([^"'\n]+)/i);

      const title = titleMatch?.[1]?.trim() || "Sample Slide";
      const topic = topicMatch?.[1]?.trim() || "general subject";

      const content = generateMockSlideContent(title, topic);
      return {
        text: content,
        finishReason: "stop",
      };
    }

    if (lowerMessage.includes("image") || lowerMessage.includes("generate")) {
      return {
        text: "https://picsum.photos/800/600?random=" + Date.now(),
        finishReason: "stop",
      };
    }

    if (lowerMessage.includes("search") || lowerMessage.includes("web")) {
      return {
        text: JSON.stringify({
          results: [
            {
              title: "Overview",
              snippet: "General information about the topic...",
            },
            {
              title: "Key Points",
              snippet: "Important aspects to consider...",
            },
            { title: "Resources", snippet: "Further reading materials..." },
          ],
        }),
        finishReason: "stop",
      };
    }

    const responses = [
      `I've analyzed the request for ${lastMessage.slice(0, 50) || "the content"}... Here's my response with relevant information and actionable insights.`,
      `Based on your input, I recommend considering multiple perspectives on this topic. The key considerations include feasibility, impact, and alignment with goals.`,
      `Here's a structured approach to address your request. I can help you break this down into manageable components and provide detailed guidance for each step.`,
    ];

    return {
      text:
        responses[Math.floor(Math.random() * responses.length)] ??
        responses[0] ??
        "Response generated successfully.",
      finishReason: "stop",
    };
  }

  async *stream(options: AICompletionOptions): AsyncGenerator<AIStreamPart> {
    await delay(100);

    const result = await this.complete(options);
    const text = result.text || "";

    for (const char of text) {
      await delay(20);
      yield { type: "text", text: char };
    }

    yield { type: "done" };
  }

  getAvailableModels(): AIModelConfig[] {
    return [mockDefaultModel];
  }

  getDefaultModel(): AIModelConfig {
    return mockDefaultModel;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
