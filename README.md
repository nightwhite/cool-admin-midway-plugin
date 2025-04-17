# Cloudflare R2 上传插件

一个兼容 Cloudflare R2 的文件上传插件，支持直接上传、预签名URL上传等功能。

## 插件标识

在调用插件时需要使用的唯一标识：

- 标识：`upload-r2`

## 配置参数

```json
{
  "accessKeyId": "必须，Cloudflare R2 的 accessKeyId",
  "secretAccessKey": "必须，Cloudflare R2 的 accessKeySecret",
  "bucket": "必须，Cloudflare R2 的 bucket 名称",
  "region": "可选，Cloudflare R2 的区域，默认为 auto",
  "endpoint": "必须，Cloudflare R2 的 endpoint URL",
  "forcePathStyle": "可选，对于 Cloudflare R2 必须设置为 true",
  "publicDomain": "可选，自定义域名，不设置则使用默认的 R2 域名"
}
```

## 功能方法

插件提供以下方法用于文件上传和管理：

### upload

生成用于前端直接上传到 R2 的配置信息。

```ts
/**
 * 生成前端上传所需的配置
 * @param ctx 请求上下文
 * @returns 上传配置
 */
async upload(ctx?: any): Promise<any>
```

### uploadWithKey

将本地文件上传到指定的 R2 路径。

```ts
/**
 * 上传文件到指定路径
 * @param filePath 本地文件路径
 * @param key R2 存储路径
 * @returns 上传后的文件 URL
 */
async uploadWithKey(filePath: string, key: string): Promise<string>
```

### downAndUpload

下载远程文件并上传到 R2。

```ts
/**
 * 下载远程文件并上传
 * @param url 远程文件 URL 或本地文件路径
 * @param fileName 可选，自定义文件名
 * @returns 上传后的文件 URL
 */
async downAndUpload(url: string, fileName?: string): Promise<string>
```

### getMetaFileObj

获取底层 S3 客户端实例。

```ts
/**
 * 获取 S3 客户端实例
 * @returns S3 客户端
 */
getMetaFileObj(): S3
```

## 调用示例

```ts
import { Inject } from '@midwayjs/core';
import { PluginService } from '@cool-midway/core';

export class YourService {
  @Inject()
  pluginService: PluginService;

  async uploadFile() {
    // 获取插件实例
    const instance = await this.pluginService.getInstance('upload-r2');

    // 直接上传本地文件
    const url = await instance.uploadWithKey('/path/to/local/file.jpg', 'uploads/file.jpg');
    console.log('上传后的URL:', url);

    // 下载远程文件并上传
    const remoteUrl = await instance.downAndUpload('https://example.com/image.jpg');
    console.log('远程文件上传后的URL:', remoteUrl);
  }

  async getUploadConfig(ctx) {
    // 获取插件实例
    const instance = await this.pluginService.getInstance('upload-r2');

    // 获取前端上传配置
    const config = await instance.upload(ctx);
    return config;
  }
}
```

## 特别说明

1. 对于 Cloudflare R2，必须在 R2 管理控制台中正确配置 CORS 规则，至少包含以下设置：
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET", "DELETE", "OPTIONS", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 86400
  }
]
```

2. 使用 Cloudflare R2 时，`forcePathStyle` 参数必须设置为 `true`。

## 更新日志

- v1.0.0 (2025-04-17)
  - 初始版本
  - 支持 Cloudflare R2 上传
  - 提供多种上传方式和辅助方法
