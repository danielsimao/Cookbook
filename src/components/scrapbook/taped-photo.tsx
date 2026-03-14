export function TapedPhoto({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`photo-taped ${className}`}>
      <img
        src={src}
        alt={alt}
        className="w-full aspect-video object-cover block"
      />
    </div>
  );
}
