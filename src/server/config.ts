import { Db } from "./loki";

export interface IConfig {
    db?: Db;
    port: number;
}

export const config: IConfig = {
    port: parseInt(process.env.PORT || "41547")
};
export default config;
