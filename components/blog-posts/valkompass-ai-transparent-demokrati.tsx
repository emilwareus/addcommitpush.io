import { BlogHeading, BlogList, BlogListItem } from '@/components/custom';

export function ValkompassAiTransparentDemokratiContent() {
  return (
    <>
      <div
        className="prose prose-invert prose-base sm:prose-lg md:prose-xl max-w-none
          prose-headings:text-primary prose-headings:font-bold prose-headings:mt-12 prose-headings:mb-6
          prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
          prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-6
          prose-a:text-secondary prose-a:no-underline hover:prose-a:underline
          prose-strong:text-accent
          prose-ul:text-foreground prose-ul:my-6
          prose-li:text-foreground prose-li:my-2"
      >
        {/* TODO: Add cover image */}
        <BlogHeading level={1}>Valkompass.ai</BlogHeading>

        <p>
          Demokrati kräver informerade väljare. I Sverige 2025 står vi inför en paradox: vi har{' '}
          <a
            href="https://www.scb.se/hitta-statistik/sverige-i-siffror/manniskorna-i-sverige/valdeltagande-i-sverige/"
            target="_blank"
            rel="noopener noreferrer"
          >
            högt valdeltagande (ca 84%)
          </a>{' '}
          – samtidigt visar{' '}
          <a
            href="https://medieakademin.se/fortroendebarometern/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Förtroendebarometern 2025
          </a>{' '}
          att endast ~16% litar på politiska partier (lägsta på flera år). Med mindre än ett år till
          valet 2026 drunknar sakpolitik i sociala medier, AI-genererat innehåll och vinklad
          rapportering. Vi förtjänar bättre.
        </p>

        <p>
          Därför bygger mina vänner och jag{' '}
          <a href="https://www.valkompass.ai" target="_blank" rel="noopener noreferrer">
            Valkompass.ai
          </a>
          , för att ge information som <strong>möter väljaren</strong> på deras villkor – grundad i
          officiella dokument, genomförd politik och Sveriges egen data. Den bryr sig inte om
          rykten, retoriska knep, personpåhopp eller rubriker. Vi vill att du – på ett personligt
          anpassat sätt – ska kunna förstå vad partier säger och faktiskt gör.
        </p>

        <BlogHeading level={1}>Vad som gör Valkompass.ai annorlunda</BlogHeading>

        <p>
          Till skillnad från traditionella valkompasser med statiska frågor är Valkompass.ai
          samtalsdriven – du kan ställa följdfrågor och fördjupa dig i ditt tempo. Svaren är
          källgrundade, byggda på partiprogram, valmanifest, budgetar, riksdagsprotokoll och
          voteringar, inte tyckande. Och varje svar ska kunna spåras till en källa för full
          transparens.
        </p>

        <BlogHeading level={1}>Valkompass.ai är en AI – med strikta begränsningar</BlogHeading>

        <p>
          Jag är trött på politisk AI som gissar. Valkompass.ai är byggd för att inte få &quot;tänka
          själv&quot; – den får endast söka i vår kunskapsbas och sammanfatta dokument. Tekniskt
          använder vi en hårt begränsad RAG-arkitektur (Retrieval-Augmented Generation) med{' '}
          <a
            href="https://ai.google.dev/gemini-api/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Gemini 2.5 Flash
          </a>
          , men svaren måste alltid bottna i källor. Den kan inte fantisera utan citerar och
          sammanfattar endast från godkända dokument, med länkar och gärna ordagranna citat. Finns
          ingen källa säger vi det rakt ut – istället för att fylla i luckor. Och koden är öppen
          så svar kan flaggas för granskning och förbättring.
        </p>

        <blockquote className="border-l-4 border-secondary pl-4 italic my-8 text-foreground/80">
          De dokument jag inte läser, men som innehåller det jag behöver veta.
        </blockquote>

        <p>
          AIn sammanfattar på det sätt du ber om: punktform, berättelse, jämförelse mellan partier
          eller längre rapporter. Exempelvis &quot;Vad tycker partierna om kärnkraft?&quot; eller
          &quot;Jämför S och M:s ekonomiska politik&quot;.
        </p>

        <BlogHeading level={1}>Byggd av väljare, för väljare</BlogHeading>

        <p>
          Utan politisk inblandning eller vinkling. Den ska hjälpa dig utan förutfattade meningar
          eller moralpredikningar. Jag litar på att väljare kan avgöra vad som är rätt för dem
          själva – och när frågor är kontroversiella måste vi kunna ha den diskussionen utan att
          stoppa huvudet i sanden.
        </p>

        <p>
          Det här är svårt och blir aldrig perfekt. Därför nästa princip:
        </p>

        <BlogHeading level={1}>Öppet för alla att tycka och bidra</BlogHeading>

        <p>
          Valkompass.ai är byggt på öppna principer. All kod och data är tillgänglig för världen att
          granska, kritisera och förbättra. Tycker du vi gjort fel val i teknik, data eller
          styrning av AIn – hjälp oss göra den bättre. Koden och data finns på{' '}
          <a
            href="https://github.com/valkompass-ai/valkompass-ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/valkompass-ai/valkompass-ai
          </a>
          .
        </p>

        <BlogHeading level={1}>Integritet först</BlogHeading>

        <p>
          Ingen profil, inget konto – dina frågor kopplas inte till en identitet. Inga
          spårningscookies, bara minimal teknisk data för att förbättra systemet. Och eftersom
          koden är öppen kan du verifiera påståendena själv.
        </p>

        <BlogHeading level={1}>Nästa steg</BlogHeading>

        <p>
          Under ett år till valet 2026. Målet är att göra det mest informerade valet någonsin.
          Därför planerar vi att:
        </p>

        <BlogList variant="unordered">
          <BlogListItem>
            Utöka politiska datan till voteringar, protokoll och budgetar (via{' '}
            <a
              href="https://www.riksdagen.se/sv/dokument-och-lagar/riksdagens-oppna-data/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Riksdagens öppna data
            </a>
            ).
          </BlogListItem>
          <BlogListItem>
            Göra statistik tillgänglig från{' '}
            <a
              href="https://www.scb.se/vara-tjanster/oppna-data/"
              target="_blank"
              rel="noopener noreferrer"
            >
              SCB (PxWeb API)
            </a>{' '}
            för att ge bättre kontext till politiska förslag.
          </BlogListItem>
          <BlogListItem>
            Förbättra konversationen: bättre flöde, relevanta motfrågor och smarta
            uppföljningsförslag.
          </BlogListItem>
          <BlogListItem>
            Undersöka en lokal, &quot;privat&quot; profil som endast finns på din enhet (valbar),
            för bättre kontext – utan att lämna din dator.
          </BlogListItem>
        </BlogList>

        <BlogHeading level={1}>Vill du hjälpa till?</BlogHeading>

        <p>
          Maila mig på <a href="mailto:emil@wareus.io">emil@wareus.io</a>. Skriv lite kod,
          öppna ett issue eller föreslå data vi saknar:
        </p>

        <BlogList variant="unordered">
          <BlogListItem>
            <a
              href="https://github.com/valkompass-ai/valkompass-ai"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub-repo
            </a>{' '}
            – setup på några minuter.
          </BlogListItem>
          <BlogListItem>
            <a
              href="https://github.com/valkompass-ai/valkompass-ai/issues/new/choose"
              target="_blank"
              rel="noopener noreferrer"
            >
              Öppna ett issue
            </a>{' '}
            – bugg, förbättring eller dokumentlänk.
          </BlogListItem>
          <BlogListItem>
            <a
              href="https://www.valkompass.ai"
              target="_blank"
              rel="noopener noreferrer"
            >
              Testa Valkompass.ai
            </a>{' '}
            – och berätta om svaret hjälpte.
          </BlogListItem>
        </BlogList>

        <p>Låt oss göra Sverige mer informerat.</p>

        <p className="mt-8 text-foreground/60">/Emil</p>
      </div>
    </>
  );
}
