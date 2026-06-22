import { useRef, useState, useCallback } from "react";
import {
  Upload,
  ImageIcon,
  Loader2,
} from "lucide-react";

type UploadPanelProps = {
  onFileSelected: (file: File, preview: string) => void;
  disabled?: boolean;
  isProcessing?: boolean;
};

export default function UploadPanel({
  onFileSelected,
  disabled,
  isProcessing,
}: UploadPanelProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return;
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        onFileSelected(file, e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onFileSelected, disabled]
  );

  return (
    <div className="w-full">
      <label
        htmlFor="pipeline-upload"
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        className={`
          relative flex flex-col items-center justify-center gap-4
          rounded-2xl border-2 border-dashed
          py-16 px-8 text-center cursor-pointer
          transition-all duration-300
          ${dragActive
            ? "border-blue-500 bg-blue-50/80 scale-[1.01]"
            : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50"
          }
          ${disabled ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        {isProcessing ? (
          <>
            <div className="p-4 rounded-2xl bg-blue-50">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            </div>
            <p className="text-base font-medium text-slate-700">
              Processing pipeline…
            </p>
          </>
        ) : (
          <>
            <div className="p-4 rounded-2xl bg-white shadow-sm border border-slate-100">
              <Upload className="h-8 w-8 text-slate-500" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">
                Upload & Analyze Image
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Drop a traffic image here, or click to browse
              </p>
              <p className="text-xs text-slate-400 mt-1.5">
                Supports JPG, PNG, WEBP
              </p>
            </div>
          </>
        )}
        <input
          id="pipeline-upload"
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
    </div>
  );
}
