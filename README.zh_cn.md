# ElasticSync

ElasticSearch 同步工具 by [ZoomEye](http://www.zoomeye.org)

跨主机复制 ElasticSearch 所有索引的映射和设置到本地开发环境，同时拉取部分测试数据，便于开发和测试。

## 使用说明

ElasticSync 在不同的 ElasticSearch 实例之间传输数据。数据源和目标的格式都形如 `域名或IP:端口`.

如将 `192.168.1.1:9200` 上的数据同步到本机（非镜像备份，每个 index 下的 type 默认限制 10 个文档）：

    node elasticsync.js --src=192.168.1.1:9200 --dest=localhost:9200

## 命令行选项

- `--src` 数据源，默认为 `localhost:9200`
- `--dest` 目标，默认为 `dockerhost:9200`
- `--limit` 复制文档的最大条数，默认为 10 条。这里指的是每一个 index 下某一 type 的条数，在一次复制过程中，将会遇到不只一个 index 和 type，最终总的 limit 应为乘上总 type 数后的结果。
- `--override` 是否覆盖（删除后重建）目标中同名的 index，默认为否
- `--query` 一个 ElasticSearch 的查询 JSON 字符串，复制数据时将会按照此查询对源数据进行条件筛选，默认为 `{match_all: {}}`

## 其他工具

整库备份应使用 ElasticSearch 自带的 [snapshot and restore](http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/modules-snapshots.html)