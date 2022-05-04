export interface Drop {
  url: string
  title: string
  artist: string
  image: string
  startDate: Date | null
  tokenType: DropToken
  quantity: number
  dropType: DropType
  isSoldOut?: boolean
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
    url: 'https://drops.skeletoncrew.rip/#/auction/ECLx5NFYqz3vAcq44Q6Joga5kdqZ915CWFY67vMisAHn',
    title: 'Trash Girl',
    artist: 'YELLOW TRASH CAN',
    image:
      'https://assets2.holaplex.tools/arweave/QFNoJ3Xb9dh8uWmdubFQvwk51Tr78YVU5tbmncB1Jw0?width=400',
    startDate: new Date('2022-05-04T12:00:00-04:00'),
    tokenType: DropToken.SOL,
    quantity: 1,
    dropType: DropType.AUCTION,
  },
  {
    url: '#',
    title: 'Spirits in the jungle',
    artist: 'Jason Wolcott',
    image:
      'https://assets2.holaplex.tools/arweave/-6rcSAeJlVlLBH35NvdvHiZd2OVu63olmAjO7wJu9Yk?width=400',
    startDate: new Date('2022-05-04T12:00:00-04:00'),
    tokenType: DropToken.SKULL,
    quantity: 1,
    dropType: DropType.RAFFLE,
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
    quantity: 33,
    dropType: DropType.FIXED_PRICE,
  },
  {
    url: 'https://drops.skeletoncrew.rip/#/auction/AZ5Ly6QeHGCs5ViAJMAbnbSYqPrCs7k2qs3v7BnPJseW',
    title: 'Spring',
    artist: 'ALPERH',
    image:
      'https://assets2.holaplex.tools/arweave/JYiNS0sI9uzT2nnhq7rGuvRQ3n8VAX7NbKfQqrJm-lw?width=400',
    startDate: new Date('2022-04-28T12:00:00-04:00'),
    tokenType: DropToken.SKULL,
    quantity: 33,
    dropType: DropType.FIXED_PRICE,
  },
  {
    url: '#',
    title: 'SPIKE',
    artist: 'IISO GHOSTLORD',
    image:
      'https://assets2.holaplex.tools/arweave/yRQJpCbnyhQSjuQ0MKYFzCMLrIJ6o3l7VBGPUbCtVpE?width=400',
    startDate: new Date('2022-05-05T12:00:00-04:00'),
    tokenType: DropToken.SOL,
    quantity: 1,
    dropType: DropType.AUCTION,
  },
  {
    url: '#',
    title: 'Skull Thought',
    artist: 'YELLOW TRASH CAN',
    image:
      'https://assets2.holaplex.tools/arweave/ILTwWlCp-xR-kJObe8y_0FYL_1SvyDZYGSQqGrnKJkc?width=400',
    startDate: new Date('2022-05-05T12:00:00-04:00'),
    tokenType: DropToken.SKULL,
    quantity: 1,
    dropType: DropType.RAFFLE,
  },
  {
    url: 'https://drops.skeletoncrew.rip/#/auction/Gm6i9BNpp5wbnr1xNPGBgi351dRYQQGDGGwArUTnYQyB',
    title: 'OVERWORKED',
    artist: 'Jason Wolcott',
    image:
      'https://assets2.holaplex.tools/arweave/CpbqjqNIW4W0YsTGzmKkzy_Bz4OuEKPvwGrtzBgMAqU?width=400',
    startDate: new Date('2022-05-03T12:00:00-04:00'),
    tokenType: DropToken.SOL,
    quantity: 1,
    dropType: DropType.AUCTION,
    isSoldOut: true,
  },
  {
    url: 'https://drops.skeletoncrew.rip/#/auction/6cvc4abkHmGHYeeWjoHmJsgqeymeY4ubg9dCNBx82GHm',
    title: 'THORN',
    artist: 'IISO GHOSTLORD',
    image:
      'https://assets2.holaplex.tools/arweave/bnx0rcQlXU5FY7nCAp5V29xYqp-EWEcgKZzSuc_jpPU?width=400',
    startDate: new Date('2022-05-03T12:00:00-04:00'),
    tokenType: DropToken.SKULL,
    quantity: 1,
    dropType: DropType.RAFFLE,
    isSoldOut: true,
  },
  {
    url: 'https://drops.skeletoncrew.rip/#/auction/2uab1CzL7QcZPx8VjA3x7E76c1fCwc8yiksm8V2zuqij',
    title: "Lover's Afterlife",
    artist: 'SIMON KIM',
    image:
      'https://assets2.holaplex.tools/arweave/cFA3z9QDTbz-8Qc0PRnHwpDpbWFttdAWOiOHyi90JEM?width=400',
    startDate: new Date('2022-04-29T12:00:00-04:00'),
    tokenType: DropToken.SOL,
    quantity: 1,
    dropType: DropType.AUCTION,
    isSoldOut: true,
  },
  {
    url: 'https://drops.skeletoncrew.rip/#/auction/9KvBDmtADcjtfvUeFqSzC1khVPHgqLnHUy1Qnwe2JHZs',
    title: 'Thulsa Boom',
    artist: 'SIMPLE MONSTER PARTY',
    image:
      'https://assets2.holaplex.tools/arweave/X9LPRXxxEwo-KSDaKGAFDAe13iQiUHonyURIt7mz_kQ?width=400',
    startDate: new Date('2022-04-28T12:00:00-04:00'),
    tokenType: DropToken.SOL,
    quantity: 1,
    dropType: DropType.AUCTION,
    isSoldOut: true,
  },
  {
    url: 'https://drops.skeletoncrew.rip/#/auction/DrpwfNU7TBhfrrcfbD2QZ81T1SMZwkFpqphtZEzDNkeo',
    title: 'Lodger',
    artist: 'ALPERH',
    image:
      'https://assets2.holaplex.tools/arweave/cb4qSKUYJsWvlakQwD_lPQmfL_w31N0BUZsAfipDl0c?width=400',
    startDate: new Date('2022-04-27T12:00:00-04:00'),
    tokenType: DropToken.SOL,
    quantity: 1,
    dropType: DropType.AUCTION,
    isSoldOut: true,
  },
]
