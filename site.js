// Site settings, destinations and journal posts. Edit freely.
// Photos themselves live in photos.js (managed by tools/add_photos.py).
window.SITE = {
  name: 'Blooblens',
  tagline: 'Travel Blog',
  email: 'chanchuenwei69@gmail.com',
  instagram: '',

  hero: {
    eyebrow: 'Travel Photography',
    title: 'Water, Light & Lanterns',
    subtitle: 'China · Japan — four journeys, 2025 – 2026',
    // Missing ids (e.g. a trip not added yet) are skipped automatically
    slides: ['dscf5939', 'jp26-dscf5349', 'cn26-dscf8068', 'jp25-dscf6188', 'dscf6375', 'jp26-dscf9409', 'dscf6180', 'cn26-dscf7323'],
  },

  // Facts the chat assistant can share with visitors.
  gear: 'Fujifilm X-T10',
  editing: 'Adobe Lightroom Classic',
  usage: 'Want to use, license or print one of these photos? Get in touch by email and let me know which photo and how you would like to use it.',

  chat: {
    // Address of the Cloudflare Worker in chat-worker/ once deployed, e.g.
    // 'https://blooblens-chat.yourname.workers.dev'. Leave empty to answer from site content only.
    endpoint: '',
    greeting: 'Hi! I can tell you about the trips, places and photos on this site. What would you like to know?',
    suggestions: ['Where have you travelled?', 'Show me cherry blossom', 'What camera do you use?', 'Can I use your photos?'],
  },

  aboutPhoto: 'dscf6000',
  about:
    'I travel with a camera to slow down and look closer: at canals at dawn, lanterns in the rain and ' +
    'the way a city changes once the lights come on. This site is my growing archive of those moments.',

  // Trips, newest first. 'label' tells apart trips to the same country.
  trips: [
    { id: 'china-jun-2026', title: 'China', label: 'China · Jun 2026', country: 'China', native: '中国', dates: 'June 2026', cover: 'dscf6375',
      blurb: 'Canal towns, West Lake and the lights of Shanghai.' },
    { id: 'japan-spring-2026', title: 'Japan', label: 'Japan · Spring 2026', country: 'Japan', native: '桑', dates: 'March – April 2026', cover: 'jp26-dscf5349',
      blurb: 'Three weeks chasing the cherry blossom from Osaka to Nagano, with the Suzuka Grand Prix in between.' },
    { id: 'china-jan-2026', title: 'China', label: 'China · Jan 2026', country: 'China', native: '川渝', dates: 'January 2026', cover: 'cn26-dscf8068',
      blurb: 'Pandas and teahouses in Chengdu, Chongqing’s neon cliffs and the karst gorges of Wulong.' },
    { id: 'japan-dec-2025', title: 'Japan', label: 'Japan · Dec 2025', country: 'Japan', native: '日本', dates: 'December 2025', cover: 'jp25-dscf6289',
      blurb: 'Two weeks around Kansai and Shikoku: tuna markets, sea cliffs, sacred waterfalls, castles and autumn leaves.' },
  ],

  collections: [
    { id: 'suzhou', trip: 'china-jun-2026', title: 'Suzhou', native: '苏州', dates: '14 – 16 Jun 2026', cover: 'dscf5939',
      blurb: 'Canals, stone bridges and lantern-lit streets in the city often called the Venice of the East.' },
    { id: 'hangzhou', trip: 'china-jun-2026', title: 'Hangzhou', native: '杭州', dates: '16 – 18 Jun 2026', cover: 'dscf5976',
      blurb: 'Mist, lotus and pagodas around West Lake.' },
    { id: 'watertown', trip: 'china-jun-2026', title: 'Water Town', native: '水乡', dates: '18 Jun 2026', cover: 'dscf6180',
      blurb: 'Timber houses on stilts, arched bridges and slow boats on jade-green canals.' },
    { id: 'dragonboat', trip: 'china-jun-2026', title: 'Dragon Boats', native: '端午', dates: '19 Jun 2026', cover: 'dscf6277',
      blurb: 'Drums, flags and racing crews at the Dragon Boat Festival.' },
    { id: 'shanghai', trip: 'china-jun-2026', title: 'Shanghai', native: '上海', dates: '19 – 21 Jun 2026', cover: 'dscf6375',
      blurb: 'From the Bund and Yu Garden to the towers of Lujiazui.' },

    { id: 'jp26-osaka', trip: 'japan-spring-2026', title: 'Osaka', native: '大阪', dates: '18 – 19 Mar 2026', cover: 'jp26-dscf8897', blurb: 'The castle, plum blossom, Minoo Falls and the neon of Dotonbori.' },
    { id: 'jp26-okayama', trip: 'japan-spring-2026', title: 'Okayama & Kurashiki', native: '岡山', dates: '20 – 21 Mar 2026', cover: 'jp26-dscf9017', blurb: 'Crow Castle, Korakuen and blossom over Kurashiki’s canal.' },
    { id: 'jp26-kobe', trip: 'japan-spring-2026', title: 'Kobe & Himeji', native: '神戸', dates: '22 – 23 Mar 2026', cover: 'jp26-dscf9232', blurb: 'Sea of Japan surf, Himeji in spring and Kobe harbour at dusk.' },
    { id: 'jp26-kyoto', trip: 'japan-spring-2026', title: 'Kyoto', native: '京都', dates: '25 Mar 2026', cover: 'jp26-dscf9317', blurb: 'Gion lanes, Yasaka Shrine and the first weeping cherries.' },
    { id: 'jp26-nagoya', trip: 'japan-spring-2026', title: 'Nagoya & Inuyama', native: '名古屋', dates: '26 Mar – 2 Apr 2026', cover: 'jp26-dscf9409', blurb: 'Two castles in blossom, a torii tunnel and sakura lit up at night.' },
    { id: 'jp26-suzuka', trip: 'japan-spring-2026', title: 'Suzuka Grand Prix', native: '鈴鹿', dates: '27 – 29 Mar 2026', cover: 'jp26-dscf3659', blurb: 'Three days trackside at the Japanese Grand Prix.' },
    { id: 'jp26-ise', trip: 'japan-spring-2026', title: 'Ise', native: '伊勢', dates: '30 – 31 Mar 2026', cover: 'jp26-dscf4513', blurb: 'Ise Jingu’s cedar forest, sake offerings and riverside blossom.' },
    { id: 'jp26-nakasendo', trip: 'japan-spring-2026', title: 'Nakasendo', native: '中山道', dates: '3 Apr 2026', cover: 'jp26-dscf4825', blurb: 'Walking the old highway between the post towns of Magome and Tsumago.' },
    { id: 'jp26-hokuriku', trip: 'japan-spring-2026', title: 'Kanazawa & Toyama', native: '北陸', dates: '4 – 6 Apr 2026', cover: 'jp26-dscf5244', blurb: 'Castle blossom, samurai lanes, the Alps over Toyama Bay and a fiery sunset.' },
    { id: 'jp26-nagano', trip: 'japan-spring-2026', title: 'Ueda & Nagano', native: '長野', dates: '7 – 9 Apr 2026', cover: 'jp26-dscf5757', blurb: 'Ueda Castle, Zenko-ji and blossom under blue mountain skies.' },

    { id: 'cn26-chengdu', trip: 'china-jan-2026', title: 'Chengdu', native: '成都', dates: '23 – 24 Jan 2026', cover: 'cn26-dscf7323',
      blurb: 'Giant pandas, old lanes, teahouses and Anshun Bridge glowing over the river.' },
    { id: 'cn26-chongqing', trip: 'china-jan-2026', title: 'Chongqing', native: '重庆', dates: '25 – 27 Jan 2026', cover: 'cn26-dscf8068',
      blurb: 'A city stacked up its hillsides: painted stairways, Hongyadong at night and a train through a building.' },
    { id: 'cn26-wulong', trip: 'china-jan-2026', title: 'Wulong', native: '武隆', dates: 'Jan 2026', cover: 'cn26-dscf8300',
      blurb: 'The Three Natural Bridges: limestone arches, misty gorges and an old post station far below.' },

    { id: 'jp25-wakayama', trip: 'japan-dec-2025', title: 'Wakayama', native: '和歌山', dates: '10 Dec 2025', cover: 'jp25-dscf6048',
      blurb: 'Ramen, a tuna-cutting show, a sleepy station cat and a little red train.' },
    { id: 'jp25-shirahama', trip: 'japan-dec-2025', title: 'Shirahama', native: '白浜', dates: '11 Dec 2025', cover: 'jp25-dscf6124',
      blurb: 'White sand, the Sandanbeki cliffs, the rock shelves of Senjojiki and Engetsu Island.' },
    { id: 'jp25-nachi', trip: 'japan-dec-2025', title: 'Kumano Nachi', native: '熊野那智', dates: '12 Dec 2025', cover: 'jp25-dscf6188',
      blurb: 'A dawn tuna auction, then Nachi Falls, its pagoda and a shrine wrapped in autumn colour.' },
    { id: 'jp25-amanohashidate', trip: 'japan-dec-2025', title: 'Amanohashidate', native: '天橋立', dates: '13 Dec 2025', cover: 'jp25-dscf6242',
      blurb: 'The pine-covered sandbar known as the bridge to heaven.' },
    { id: 'jp25-himeji', trip: 'japan-dec-2025', title: 'Himeji', native: '姫路', dates: '14 – 15 Dec 2025', cover: 'jp25-dscf6289',
      blurb: 'The White Heron Castle and a quiet garden of koi and maples.' },
    { id: 'jp25-shikoku', trip: 'japan-dec-2025', title: 'Shikoku', native: '四国', dates: '16 – 18 Dec 2025', cover: 'jp25-dscf6369',
      blurb: 'The long climb to Kotohira-gu through autumn maples, and the Naruto whirlpools.' },
    { id: 'jp25-kyoto', trip: 'japan-dec-2025', title: 'Kyoto & Nara', native: '京都', dates: '19 – 20 Dec 2025', cover: 'jp25-dscf6709',
      blurb: 'Lantern-lit alleys, Kyoto Tower, Nara’s deer and a riverside afternoon.' },
  ],

  // Journal posts. 'cover' is the header photo; body items are paragraphs (strings) or { photo: 'id' }.
  journal: [
    { id: 'sakura-season', collection: 'jp26-hokuriku', cover: 'jp26-dscf5349', date: '2026-04-06', title: 'Chasing the Cherry Blossom',
      excerpt: 'Three weeks following spring north through Japan, with a Grand Prix along the way.',
      body: [
        'The trip began in mid-March with plum blossom at Osaka Castle and bare cherry branches. By the time it reached Kyoto, the first weeping cherries in Maruyama Park were opening.',
        { photo: 'jp26-dscf9317' },
        'At the end of March came three days at Suzuka for the Japanese Grand Prix: panning shots through the esses and packed grandstands on race day.',
        { photo: 'jp26-dscf3659' },
        'Then the blossom took over. In Toyama, boats drifted along the Matsukawa River under a tunnel of cherry trees, and in Nagano the trees were in full bloom under clear blue mountain skies.',
        { photo: 'jp26-dscf5757' },
      ] },
    { id: 'chengdu-chongqing', collection: 'cn26-chongqing', cover: 'cn26-dscf8068', date: '2026-01-26', title: 'Pandas, Neon and Karst',
      excerpt: 'A winter week in Sichuan and Chongqing, from bamboo groves to a train through a building.',
      body: [
        'Chengdu started with the giant pandas: eating bamboo, napping on platforms and climbing trees. In the evening, Anshun Bridge glowed gold over the Jin River.',
        { photo: 'cn26-dscf7323' },
        'Chongqing is a city stacked up its hillsides. Hongyadong, the cliffside complex, lights up layer after layer at night, and the Liziba monorail runs straight through an apartment block.',
        { photo: 'cn26-dscf8068' },
        'A day out to Wulong brought a complete change of scene: limestone arches, misty gorges and an old post station far below the Three Natural Bridges.',
        { photo: 'cn26-dscf8300' },
      ] },
    { id: 'kansai-autumn', collection: 'jp25-nachi', cover: 'jp25-dscf6188', date: '2025-12-12', title: 'Late Autumn in Kansai',
      excerpt: 'Dawn tuna auctions, sacred waterfalls and the last red maples of the year.',
      body: [
        'December is late for autumn colour, but in the south of the Kii Peninsula the maples were still burning red. The day started before sunrise at the tuna auction, with rows of fresh catch laid out on the wet floor.',
        { photo: 'jp25-dscf6151' },
        'A short drive inland, the three-storied pagoda of Seiganto-ji stands in front of Nachi Falls, the tallest single-drop waterfall in Japan.',
        { photo: 'jp25-dscf6188' },
        'Further north, Himeji Castle lived up to its nickname, the White Heron, gleaming above the last of the autumn trees.',
        { photo: 'jp25-dscf6289' },
      ] },
    { id: 'suzhou-canals', collection: 'suzhou', cover: 'dscf5919', date: '2026-06-15', title: 'Canals and Lanterns of Suzhou',
      excerpt: 'Whitewashed walls, stone bridges and a thousand-year-old street that comes alive after dark.',
      body: [
        'Suzhou is laced with canals. Boats still move slowly between white walls and dark tiled roofs, and almost every turn brings another stone bridge.',
        { photo: 'dscf5903' },
        'Shantang Street runs beside one of the oldest canals in the city. By day it is lanterns and shopfronts; at night the whole street turns gold and the reflections do half the work.',
        { photo: 'dscf5939' },
        'Above it all, the leaning pagoda on Tiger Hill has watched over the city for about a thousand years.',
        { photo: 'dscf5908' },
      ] },
    { id: 'west-lake', collection: 'hangzhou', cover: 'dscf5974', date: '2026-06-17', title: 'Mist and Lotus on West Lake',
      excerpt: 'Soft light, still water and pagodas fading into the haze.',
      body: [
        'West Lake rarely gives you hard light. Instead it offers haze, layers of hills and water so still that boats seem to float on air.',
        { photo: 'dscf5976' },
        'In early summer the lotus takes over the edges of the lake, and pavilions rise out of a sea of green leaves.',
        { photo: 'dscf5953' },
        'The three stone lanterns of Three Pools Mirroring the Moon are among the most recognisable sights in China.',
        { photo: 'dscf5984' },
      ] },
    { id: 'water-town', collection: 'watertown', cover: 'dscf6112', date: '2026-06-18', title: 'A Day in the Water Town',
      excerpt: 'Where the streets are canals and the houses stand in the water.',
      body: [
        'In the water towns the canal is the main street. Timber houses lean out over the water, propped up on stone stilts.',
        { photo: 'dscf6107' },
        'Boatmen scull visitors under arched bridges while the green of the water and the trees seems to merge into one.',
        { photo: 'dscf6180' },
      ] },
    { id: 'dragon-boats', collection: 'dragonboat', cover: 'dscf6280', date: '2026-06-19', title: 'Drums on the Water',
      excerpt: 'Colour, noise and racing crews at the Dragon Boat Festival.',
      body: [
        'The Dragon Boat Festival falls on the fifth day of the fifth lunar month. Crews race to the beat of a drum, and ceremonial boats dressed in flags parade along the course.',
        { photo: 'dscf6277' },
        'Up close it is all rhythm: the drummer calling the pace and every paddle hitting the water at once.',
        { photo: 'dscf6295' },
      ] },
    { id: 'shanghai', collection: 'shanghai', cover: 'dscf6382', date: '2026-06-21', title: 'Shanghai, Old and New',
      excerpt: 'Heritage facades, temple roofs and a skyline that disappears into the clouds.',
      body: [
        'Shanghai is a city of contrasts. Along the Bund, early twentieth-century buildings glow gold every night across the river from the towers of Lujiazui.',
        { photo: 'dscf6375' },
        'In the old city, Yu Garden’s upturned eaves are lit red and gold, and the bazaar around it is busy long after dark.',
        { photo: 'dscf6404' },
        'Across the river, standing at the foot of the towers and looking straight up is the best way to feel their scale.',
        { photo: 'dscf6448' },
      ] },
  ],
};
