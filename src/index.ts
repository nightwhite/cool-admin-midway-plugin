import {
  BasePlugin,
  BaseUpload,
  CLOUDTYPE,
  MODETYPE,
  Mode,
  PluginInfo,
} from "@cool-midway/plugin-cli";
import fs from "fs";
import { v1 as uuid } from "uuid";
import moment from "moment";
import axios from "axios";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"; // 导入 getSignedUrl
import _ from "lodash";

/**
 * Amazon S3 file upload plugin
 */
export class CoolPlugin extends BasePlugin implements BaseUpload {
  private client: S3Client;

  /**
   * Initialize the plugin
   * @param pluginInfo - Configuration information for the plugin
   */
  async init(pluginInfo: PluginInfo): Promise<void> {
    super.init(pluginInfo);
    const { accessKeyId, secretAccessKey, region = 'auto', publicDomain, endpoint } = pluginInfo.config;
    this.client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      endpoint: endpoint,
      forcePathStyle: true
    });
  }

  /**
   * Retrieve the upload mode
   * @returns The mode configuration
   */
  async getMode(): Promise<Mode> {
    return {
      mode: MODETYPE.CLOUD,
      type: CLOUDTYPE.AWS,
    };
  }

  /**
   * Retrieve the raw S3 client object
   * @returns The S3 client instance
   */
  getMetaFileObj(): S3Client {
    return this.client;
  }

  /**
   * Download a file from a given URL and return it as a Buffer
   * @param url - The URL of the file to download
   * @returns A Promise resolving to the file content as a Buffer
   */
  async downloadFileAsBuffer(url: string): Promise<Buffer> {
    try {
      // Use Axios to fetch the file with arraybuffer response type
      const response = await axios.get(url, {
        responseType: "arraybuffer",
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error("Error downloading file:", error);
      throw error;
    }
  }

  /**
   * Download a file and upload it to S3
   * @param url - The URL or local path of the file
   * @param fileName - Optional custom file name
   * @returns The URL of the uploaded file
   */
  async downAndUpload(url: string, fileName?: string): Promise<string> {
    let extend = "";
    if (url.includes(".")) {
      const urlArr = url.split(".");
      extend = `.${urlArr[urlArr.length - 1].split("?")[0]}`;
    }

    const data = url.includes("http")
      ? await this.downloadFileAsBuffer(url)
      : fs.readFileSync(url);
    const uuidStr = uuid();
    const name = `uploads/${moment().format("YYYYMMDD")}/${fileName ?? `${uuidStr}${extend}`}`;
    const { bucket, fields, publicDomain } = this.pluginInfo.config;

    const uploadParams = {
      Bucket: bucket,
      Key: name,
      Body: data,
      ACL: fields?.acl ?? "public-read",
    };

    const command = new PutObjectCommand(uploadParams);
    await this.client.send(command);

    return `${publicDomain}/${name}`
  }

  /**
   * Upload a file to S3 with a specified key
   * @param filePath - Path to the local file
   * @param key - S3 key (path) for the file; overwrites if the key exists
   * @returns The URL of the uploaded file
   */
  async uploadWithKey(filePath: string, key: string): Promise<string> {
    const { bucket, fields, publicDomain } = this.pluginInfo.config;
    const data = fs.readFileSync(filePath);

    const uploadParams = {
      Bucket: bucket,
      Key: key,
      Body: data,
      ACL: fields?.acl ?? "public-read",
    };

    const command = new PutObjectCommand(uploadParams);
    await this.client.send(command);

    return `${publicDomain}/${key}`
  }

  /**
   * Generate a presigned URL for file upload
   * @param ctx - Optional context object containing request data
   * @returns The presigned post data
   */
  async upload(ctx?: any): Promise<any> {
    let { bucket, fields = {}, conditions = [], expires = 3600, publicDomain} = this.pluginInfo.config;
    const { key } = ctx?.request?.body ?? {};

    if (!conditions.length) {
      conditions = [{ acl: "public-read" }, { bucket }];
    }

    if (_.isEmpty(fields)) {
      fields = { acl: "public-read" };
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ACL: fields?.acl ?? "public-read",
    });
    const signedUrl = await getSignedUrl(this.client, command, { expiresIn: expires });
    return {
      url: signedUrl,
      publicDomain: publicDomain
    };
  }
}

// Export the plugin instance; Plugin name must not be modified
export const Plugin = CoolPlugin;