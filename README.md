# swagger-codegen README

通过 SwaggerApi 接口,快速创建序列化文件，目前支持 TypeScript。

## HOW TO USE

设置 建议为工作区单独设置，这样该配置会随着项目一起保存，并且不会影响后续的项目

```json
{
  "swagger-codegen.urls": [
    "http://127.0.0.1:3000/v2/api-docs?group=api",
    "http://127.0.0.1:4000/v2/api-docs?group=api"
  ]
}
```

通过快捷键 Ctrl+F10 或通过命令面板找到 Swagger Codegen 即可自动生成序列化文件

## Release Notes

This section describes major releases and their improvements. For a detailed list of changes please refer to the [change log](./CHANGELOG.md);

### Version 1.0.0

- 首个正式版本
- ts interface 注释迁移至内部
