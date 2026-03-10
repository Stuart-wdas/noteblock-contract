export default function FastScrollBar({ alphabet }: { alphabet?: string[] }) {
  return (
    <div className='sticky top-20 z-30 ml-2 hidden max-h-[70vh] flex-col items-center rounded-md border border-emerald-400/50 bg-emerald-500/20 p-1 md:flex'>
      {alphabet?.map((letter) => (
        <a
          key={letter}
          href={`#letter-${letter}`}
          className='text-[10px] font-bold text-white transition hover:scale-110'
        >
          {letter}
        </a>
      ))}
    </div>
  );
}
