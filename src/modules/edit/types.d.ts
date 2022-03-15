export interface NewData {
  name: string
  description: string
  logo: {
    url: string
    name?: string
    type?: string
  }
  banner: {
    url: string
    name?: string
    type?: string
  }
  creators: { address: string }[]
}
