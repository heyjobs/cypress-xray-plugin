import { IStatusCategory } from "./statusCategory";

export interface IStatusDetails {
    /**
     * The URL of the status.
     */
    self?: string;
    /**
     * The description of the status.
     */
    description?: string;
    /**
     * The URL of the icon used to represent the status.
     */
    iconUrl?: string;
    /**
     * The name of the status.
     */
    name?: string;
    /**
     * The ID of the status.
     */
    id?: string;
    /**
     * The category assigned to the status.
     */
    statusCategory?: IStatusCategory;
}
export interface StatusDetailsServer extends IStatusDetails {
    statusColor?: string;
}
