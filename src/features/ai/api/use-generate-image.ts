import { useMutation } from "@tanstack/react-query";

interface GenerateImageRequest {
  prompt: string;
}

interface GenerateImageResponse {
  original_prompt: string;
  pre_enhanced_prompt: string;
  enhanced_prompt: string;
  gpt_image_base64: string;
  gpt_image_url: string;
  svg_code: string;
  svg_url: string;
}

export const useGenerateImage = () => {
  const mutation = useMutation<
    GenerateImageResponse,
    Error,
    GenerateImageRequest
  >({
    mutationFn: async ({ prompt }) => {
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      return response.json();
    },
  });

  return mutation;
};
