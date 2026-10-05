import Image from 'next/image';
import { SlideFrame } from './shared';

export function CloseSlide() {
  return (
    <SlideFrame
      chapter="most"
      heading={{
        title: 'Build the machine',
        subtitle: 'Agents build. Humans decide what ships.',
      }}
    >
      <Image
        src="/presentations/software-factory/we-are-not-the-same.jpg"
        alt="Meme: 'Vibe coders don't look at their code. I don't look at the code. We are not the same.'"
        width={1000}
        height={1000}
        className="mx-auto h-auto w-full max-w-[min(40rem,54vh)] border-[1.5px] border-[var(--hair)]"
      />
    </SlideFrame>
  );
}
