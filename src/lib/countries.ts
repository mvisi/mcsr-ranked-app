import { flag } from '@/lib/format';

// ISO 3166-1 countries remain available even when absent from the top 150.
const codes =
  'ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bl bm bn bo bq br bs bt bv bw by bz ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj dk dm do dz ec ee eg eh er es et fi fj fk fm fo fr ga gb gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu id ie il im in io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mf mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om pa pe pf pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sj sk sl sm sn so sr ss st sv sx sy sz tc td tf tg th tj tk tl tm tn to tr tt tv tw tz ua ug um us uy uz va vc ve vg vi vn vu wf ws ye yt za zm zw'.split(
    ' ',
  );

const fallbackNames: Record<string, string> = {
  al: 'Albania',
  au: 'Australia',
  at: 'Austria',
  be: 'Belgium',
  br: 'Brazil',
  ca: 'Canada',
  cn: 'China',
  cz: 'Czechia',
  dk: 'Denmark',
  fi: 'Finland',
  fr: 'France',
  de: 'Germany',
  gr: 'Greece',
  hk: 'Hong Kong',
  hu: 'Hungary',
  in: 'India',
  id: 'Indonesia',
  ie: 'Ireland',
  il: 'Israel',
  it: 'Italy',
  jp: 'Japan',
  kr: 'South Korea',
  mx: 'Mexico',
  nl: 'Netherlands',
  nz: 'New Zealand',
  no: 'Norway',
  ph: 'Philippines',
  pl: 'Poland',
  pt: 'Portugal',
  ro: 'Romania',
  ru: 'Russia',
  sg: 'Singapore',
  za: 'South Africa',
  es: 'Spain',
  se: 'Sweden',
  ch: 'Switzerland',
  tw: 'Taiwan',
  tr: 'Türkiye',
  ua: 'Ukraine',
  gb: 'United Kingdom',
  us: 'United States',
  vn: 'Vietnam',
};

function countryName(code: string) {
  try {
    if (typeof Intl.DisplayNames === 'function') {
      return (
        new Intl.DisplayNames(['en'], { type: 'region' }).of(
          code.toUpperCase(),
        ) ?? code.toUpperCase()
      );
    }
  } catch {
    // Some Android runtimes do not provide region display names.
  }
  return fallbackNames[code] ?? code.toUpperCase();
}

export const countryOptions = [
  { label: '🌐 World', value: 'world' },
  ...codes
    .map((code) => ({
      label: `${flag(code)} ${countryName(code)} · ${code.toUpperCase()}`,
      value: code,
    }))
    .sort((a, b) => a.label.slice(5).localeCompare(b.label.slice(5))),
];
