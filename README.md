# ElasticSync

[中文说明](README.zh_cn.md)

Transport ElasticSearch data from remote server to local, for development and testing.

## Usage

ElasticSync transports data between ElasticSearch instances. A valid data source or detination should like `host:port`.

You can sync data from 192.168.1.1:9200 to localhost:9200 using following command:

> node elasticsync.js --src=192.168.1.1:9200 --dest=localhost:9200

## Options

- `--src` source (default: `localhost:9200`)
- `--dest` destination (default: `dockerhost:9200`)
- `--limit` how many objects to copy per bulk operation. Actual limit will be multiplied by the count of indexes and types. (default: 10)
- `--override` if set to true, it will drop all indexes with same name from source ElasticSearch (default: false)
- `--query` a JSON string, the filter when copying data (default: `{match_all: {}}`)

## Other Tools

For dumping entire cluster, you should use ElasicSearch's [snapshot and restore](http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/modules-snapshots.html)