import {
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";

const MODEL_NAME = "onnx-community/all-MiniLM-L6-v2-ONNX";
const EMBEDDING_DIMENSIONS = 384;

let extractorPromise: Promise<FeatureExtractionPipeline> | undefined;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  extractorPromise ??= pipeline("feature-extraction", MODEL_NAME);

  try {
    return await extractorPromise;
  } catch (error) {
    extractorPromise = undefined;
    throw error;
  }
}

export async function embedText(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, {
    pooling: "mean",
    normalize: true,
  });
  const embedding = Array.from(output.data, Number);

  if (
    embedding.length !== EMBEDDING_DIMENSIONS ||
    embedding.some((value) => !Number.isFinite(value))
  ) {
    throw new Error(
      `The embedding model must return ${EMBEDDING_DIMENSIONS} finite values`
    );
  }

  return embedding;
}

export { EMBEDDING_DIMENSIONS, MODEL_NAME };
