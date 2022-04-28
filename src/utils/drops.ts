export interface Drop {
  url: string
  title: string
  artist: string
  image: string
  startDate: Date | null
  tokenType: DropToken
  startingPrice: number
  quantity: number
  dropType: DropType
}

export enum DropType {
  DUTCH_AUCTION,
  AUCTION,
  RAFFLE,
  FIXED_PRICE,
}

export enum DropToken {
  SOL,
  SKULL,
}

export const drops: Drop[] = [
  {
    url: 'https://drops.skeletoncrew.rip/#/auction/DrpwfNU7TBhfrrcfbD2QZ81T1SMZwkFpqphtZEzDNkeo',
    title: 'Lodger',
    artist: 'ALPERH',
    image:
      'https://assets2.holaplex.tools/arweave/cb4qSKUYJsWvlakQwD_lPQmfL_w31N0BUZsAfipDl0c?width=400',
    startDate: new Date('2022-04-27T12:00:00-04:00'),
    tokenType: DropToken.SOL,
    startingPrice: 1,
    quantity: 1,
    dropType: DropType.AUCTION,
  },
  {
    // url: 'https://drops.skeletoncrew.rip/#/auction/6979Txui2UodrUjvhdYoSquAdCq4cpdMevanNC2fVKST',
    url: 'https://drops.skeletoncrew.rip/#/auction/H7m3bGpnSqDyyTv2nLMxCCxpDGmJBC7JcMxnD5HVvUYt',
    title: 'Cable Manager',
    artist: 'SIMPLE MONSTER PARTY',
    image:
      'https://assets2.holaplex.tools/arweave/5Kykvt3Rl_ug_mUuqhIawCG8x-1W_Cz9dzZ89qI__Bc?width=400',
    startDate: new Date('2022-04-27T12:00:00-04:00'),
    tokenType: DropToken.SKULL,
    startingPrice: 75000,
    quantity: 33,
    dropType: DropType.FIXED_PRICE,
  },
  {
    // url: 'https://drops.skeletoncrew.rip/#/auction/7HrbMuUg1J1afD5XVzXtnFjrWDo4RqvXipWrqs5TFgDM',
    url: 'https://drops.skeletoncrew.rip/#/auction/7PhpJXk4HTiVGJnVo8vxAz2cdichR1bCz12JEkp1WL45',
    title: 'Tiger of Eden',
    artist: 'SIMON KIM',
    image:
      'https://assets2.holaplex.tools/arweave/h1aitptLE3IPGfXmScF8TRxY12d8zRyyDj22sED2jgA?width=400',
    startDate: new Date('2022-04-27T12:00:00-04:00'),
    tokenType: DropToken.SKULL,
    startingPrice: 75000,
    quantity: 33,
    dropType: DropType.FIXED_PRICE,
  },
  {
    url: '#',
    title: 'Spring',
    artist: 'ALPERH',
    image:
      'https://assets2.holaplex.tools/arweave/JYiNS0sI9uzT2nnhq7rGuvRQ3n8VAX7NbKfQqrJm-lw?width=400',
    startDate: null, //new Date('2022-04-28T12:00:00-04:00'),
    tokenType: DropToken.SKULL,
    startingPrice: 75000,
    quantity: 33,
    dropType: DropType.FIXED_PRICE,
  },
  {
    url: '#',
    title: 'Thulsa Boom',
    artist: 'SIMPLE MONSTER PARTY',
    image:
      'https://assets2.holaplex.tools/arweave/X9LPRXxxEwo-KSDaKGAFDAe13iQiUHonyURIt7mz_kQ?width=400',
    startDate: null, //new Date('2022-04-28T12:00:00-04:00'),
    tokenType: DropToken.SOL,
    startingPrice: 1,
    quantity: 1,
    dropType: DropType.AUCTION,
  },
  {
    url: '#',
    title: "Lover's Afterlife",
    artist: 'SIMON KIM',
    image:
      'https://assets2.holaplex.tools/arweave/cFA3z9QDTbz-8Qc0PRnHwpDpbWFttdAWOiOHyi90JEM?width=400',
    startDate: null, //new Date('2022-04-29T12:00:00-04:00'),
    tokenType: DropToken.SOL,
    startingPrice: 1,
    quantity: 1,
    dropType: DropType.AUCTION,
  },
]
