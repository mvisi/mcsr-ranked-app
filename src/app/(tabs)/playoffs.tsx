import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, View } from 'react-native';

import {
  BrandHeader,
  Card,
  ExternalButton,
  Heading,
  Txt,
} from '@/components/ui';

export default function PlayoffsScreen() {
  return (
    <View className="flex-1 bg-ranked-background">
      <BrandHeader title="Season playoffs" />
      <ScrollView contentContainerClassName="gap-5 p-4 pb-8">
        <View className="items-center gap-4 rounded-md bg-ranked-green px-5 py-8">
          <Ionicons name="trophy" size={48} color="#facc15" />
          <Txt accessibilityRole="header" className="text-center text-2xl">
            MCSR Ranked Playoffs
          </Txt>
          <Txt className="text-center text-sm">
            Watch the season's best players compete.
          </Txt>
        </View>
        <Card className="gap-4">
          <Heading>Brackets & results</Heading>
          <Txt className="text-sm text-ranked-muted">
            Native playoffs are coming when the Ranked SDK supports them. Follow
            brackets, schedules, and results on the website for now.
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
    </View>
  );
}
