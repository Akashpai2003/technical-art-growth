export function DescriptionBlock({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-line text-[16px] leading-[1.5] text-[var(--color-text)] m-0 p-0">
      {text}
    </p>
  );
}
