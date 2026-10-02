import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ExternalButton, Heading, Txt } from '@/components/ui';

export default function PlayoffsScreen() {
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className="flex-1 bg-ranked-background"
    >
      <ScrollView contentContainerClassName="gap-5 p-4 pb-8">
        <Card className="gap-4">
          <Heading>Brackets & results</Heading>
          <Txt className="text-sm text-ranked-muted">
            Coming soon... Follow brackets, schedules, and results on the
            website for now.
          </Txt>
          <ExternalButton
            title="View playoffs on the website"
            url="https://mcsrranked.com/playoffs"
          />
        </Card>
        <Heading>Watch on</Heading>
        <ExternalButton
          title="YouTube · @MCSR_Ranked"
          url="https://www.youtube.com/@MCSR_Ranked/live"
          icon="logo-youtube"
        />
        <ExternalButton
          title="Twitch · @MCSRRanked"
          url="https://twitch.tv/mcsrranked"
          icon="logo-twitch"
        />
        <ExternalButton
          title="Discord server"
          url="https://discord.mcsrranked.com/"
          icon="logo-discord"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
