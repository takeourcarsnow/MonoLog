interface FileInputsProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  cameraInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCameraChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FileInputs({
  fileInputRef,
  cameraInputRef,
  onFileChange,
  onCameraChange
}: FileInputsProps) {
  return (
    <>
      {/* Hidden file input (always rendered so other controls can open it) */}
      <input
        id="uploader-file-input"
        type="file"
        accept="image/*"
        ref={fileInputRef}
        multiple
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      {/* Hidden camera-capable input as a fallback for devices/browsers where getUserMedia isn't available */}
      <input
        id="uploader-camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        style={{ display: "none" }}
        onChange={onCameraChange}
      />
    </>
  );
}