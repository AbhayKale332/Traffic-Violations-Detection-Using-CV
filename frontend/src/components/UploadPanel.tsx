import { useRef, useState, useCallback } from "react";
import { Upload, Loader2, ImageIcon, Film } from "lucide-react";

type UploadPanelProps = {
  onFileSelected: (file: File, preview: string, isVideo: boolean) => void;
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

      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if (!isImage && !isVideo) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        onFileSelected(file, e.target?.result as string, isVideo);
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
            <div className="flex items-center gap-3">
              <div className="p-3.5 rounded-2xl bg-white shadow-sm border border-slate-100">
                <ImageIcon className="h-7 w-7 text-slate-500" />
              </div>
              <span className="text-slate-300 text-2xl font-thin">|</span>
              <div className="p-3.5 rounded-2xl bg-white shadow-sm border border-slate-100">
                <Film className="h-7 w-7 text-indigo-500" />
              </div>
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">
                Upload Image or Video
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Drop a traffic image or video here, or click to browse
              </p>
              <div className="flex items-center justify-center gap-3 mt-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  <ImageIcon className="h-3 w-3" /> JPG · PNG · WEBP
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full">
                  <Film className="h-3 w-3" /> MP4 · MOV · AVI · WEBM
                </span>
              </div>
            </div>
          </>
        )}
        <input
          id="pipeline-upload"
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
    </div>
  );
}
