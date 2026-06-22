// @ts-nocheck
import * as React from "react";
import { toast } from "sonner";
import {
  type ClientUploadedFileData,
  type UploadFilesOptions,
} from "uploadthing/types";
import * as z from "zod";

import { type OurFileRouter } from "@/app/api/uploadthing/core";
import { uploadFiles } from "@/hooks/globals/useUploadthing";

export type UploadedFile<T = unknown> = ClientUploadedFileData<T>;

interface UseUploadFileProps extends Partial<
  Pick<
    UploadFilesOptions<OurFileRouter["editorUploader"]>,
    "headers" | "input" | "onUploadBegin" | "onUploadProgress" | "skipPolling"
  >
> {
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: unknown) => void;
}

export function useUploadFile({
  onUploadComplete,
  onUploadError,
  ...props
}: UseUploadFileProps = {}) {
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>();
  const [uploadingFile, setUploadingFile] = React.useState<File>();
  const [progress, setProgress] = React.useState<number>(0);
  const [isUploading, setIsUploading] = React.useState(false);

  async function uploadThing(file: File) {
    setIsUploading(true);
    setUploadingFile(file);

    try {
      const res = await uploadFiles("editorUploader", {
        ...props,
        files: [file],
        onUploadProgress: (event) => {
          const { progress } = event;
          setProgress(Math.min(progress, 100));
          props.onUploadProgress?.(event);
        },
      });

      const nextUploadedFile = res[0];
      setUploadedFile(nextUploadedFile);

      onUploadComplete?.(nextUploadedFile ?? ({} as UploadedFile));

      return nextUploadedFile;
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      const message =
        errorMessage.length > 0
          ? errorMessage
          : "Something went wrong, please try again later.";

      toast.error(message);

      // Note: We don't call onUploadError here because we'll fall back to mock upload
      // The toast already notifies the user of the original error

      // Mock upload for unauthenticated users
      // toast.info('User not logged in. Mocking upload process.');
      const mockUploadedFile = {
        key: "mock-key-0",
        appUrl: `https://mock-app-url.com/${file.name}`,
        name: file.name,
        size: file.size,
        type: file.type,
        ufsUrl: URL.createObjectURL(file),
        url: URL.createObjectURL(file),
      } as UploadedFile;

      // Simulate upload progress
      let progress = 0;

      const simulateProgress = async () => {
        while (progress < 100) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          progress += 2;
          setProgress(Math.min(progress, 100));
        }
      };

      await simulateProgress();

      setUploadedFile(mockUploadedFile);

      return mockUploadedFile;
    } finally {
      setProgress(0);
      setIsUploading(false);
      setUploadingFile(undefined);
    }
  }

  return {
    isUploading,
    progress,
    uploadedFile,
    uploadFile: uploadThing,
    uploadingFile,
  };
}

export function showErrorToast(error: unknown) {
  toast.error(getErrorMessage(error));
}

export function getErrorMessage(err: unknown) {
  const unknownError = "Something went wrong, please try again later.";

  if (err instanceof z.ZodError) {
    const errors = err.issues.map((issue) => {
      return issue.message;
    });

    return errors.join("\n");
  } else if (err instanceof Error) {
    return err.message;
  } else {
    return unknownError;
  }
}
