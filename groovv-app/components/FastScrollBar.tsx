export default function FastScrollBar({ alphabet }: { alphabet?: string[] }) {
  return (
    <div className='fixed right-2 top-1/4 z-50 flex flex-col items-center bg-green-500 rounded-md p-1'>
      {alphabet?.map((letter) => (
        <a
          key={letter}
          href={`#letter-${letter}`}
          className='text-white text-xs font-bold hover:scale-110 transition'
        >
          {letter}
        </a>
      ))}
    </div>
  );
}
