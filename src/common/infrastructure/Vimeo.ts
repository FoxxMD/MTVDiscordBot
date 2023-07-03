export interface VimeoVideo {
    uri: string
    name: string
    description: string
    type: 'video' | string
    link: string
    duration: number
    content_rating: string[]
    content_rating_class: 'safe' | string
    user: VimeoUser
}

export interface VimeoUser {
    uri: string
    name: string
    link: string
}

export interface VimeoResponse {
    statusCode: number
    body: VimeoVideo
    headers: Record<string, any>
}
