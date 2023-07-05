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

export interface VimeoResponse<ResponseType> {
    statusCode: number
    body: ResponseType
    headers: Record<string, any>
}

export interface VimeoUserFull {
    name: string
    uri: string
    created_time: string
    metadata: {
        connections: {
            followers: {
                total: number
            }
        }
    }
}

export interface VimeoChannel {
    name: string
    uri: string
    created_time: string
    metadata: {
        connections: {
            users: {
                total: number
            }
        }
    }
}
