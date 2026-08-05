declare interface Ambient { value: string }

declare type Alias = string;

export declare interface Exported<T> extends Ambient { other: T }

interface Plain { value: string }

type PlainAlias = number;