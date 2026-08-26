declare module "twitter-text/dist/parseTweet" {
  type ParsedTweet = {
    weightedLength: number
    valid: boolean
    permillage: number
    validRangeStart: number
    validRangeEnd: number
    displayRangeStart: number
    displayRangeEnd: number
  }

  export default function parseTweet(text?: string): ParsedTweet
}
