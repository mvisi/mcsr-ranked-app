import { Image, View, type ImageSourcePropType } from 'react-native';

import { Txt } from '@/components/ui';

// Original pixel icons from mcsrranked.com, bundled for native/offline rendering.
const overworldSeeds: Record<
  string,
  { name: string; icon: ImageSourcePropType }
> = {
  VILLAGE: {
    name: 'Village',
    icon: require('../../assets/images/seeds/village.png'),
  },
  BURIED_TREASURE: {
    name: 'Buried Treasure',
    icon: require('../../assets/images/seeds/buried-treasure.png'),
  },
  SHIPWRECK: {
    name: 'Shipwreck',
    icon: require('../../assets/images/seeds/shipwreck.png'),
  },
  DESERT_TEMPLE: {
    name: 'Desert Temple',
    icon: require('../../assets/images/seeds/desert-temple.png'),
  },
  RUINED_PORTAL: {
    name: 'Ruined Portal',
    icon: require('../../assets/images/seeds/ruined-portal.png'),
  },
  JUNGLE_TEMPLE: {
    name: 'Jungle Temple',
    icon: require('../../assets/images/seeds/jungle-temple.png'),
  },
};

const netherSeeds: Record<string, { name: string; icon: ImageSourcePropType }> =
  {
    STABLES: {
      name: 'Stables Bastion',
      icon: require('../../assets/images/seeds/stables.png'),
    },
    HOUSING: {
      name: 'Housing Bastion',
      icon: require('../../assets/images/seeds/housing.png'),
    },
    TREASURE: {
      name: 'Treasure Bastion',
      icon: require('../../assets/images/seeds/treasure.png'),
    },
    BRIDGE: {
      name: 'Bridge Bastion',
      icon: require('../../assets/images/seeds/bridge.png'),
    },
  };

function SeedBadge({
  value,
  seeds,
  fallback,
}: {
  value: string | null;
  seeds: typeof overworldSeeds;
  fallback: string;
}) {
  const seed = value ? seeds[value.toUpperCase()] : undefined;
  const name = seed?.name ?? (value ? value.replaceAll('_', ' ') : fallback);
  return (
    <View className="flex-row items-center gap-2 rounded-full bg-white/5 px-3 py-2">
      {seed && (
        <Image
          source={seed.icon}
          resizeMode="contain"
          style={{ width: 16, height: 16 }}
        />
      )}
      <Txt className="text-xs text-ranked-muted">{name}</Txt>
    </View>
  );
}

export function SeedBadges({
  overworld,
  nether,
}: {
  overworld: string | null;
  nether: string | null;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      <SeedBadge
        value={overworld}
        seeds={overworldSeeds}
        fallback="Unknown overworld"
      />
      <SeedBadge
        value={nether}
        seeds={netherSeeds}
        fallback="Unknown bastion"
      />
    </View>
  );
}
