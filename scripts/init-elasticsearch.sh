#!/bin/bash
set -e

ES_HOST="${ELASTICSEARCH_HOST:-http://elasticsearch:9200}"

echo "Waiting for Elasticsearch to be ready..."
until curl -sf "${ES_HOST}/_cluster/health" > /dev/null 2>&1; do
  echo "  Elasticsearch not ready yet, retrying in 3s..."
  sleep 3
done
echo "Elasticsearch is ready."

# Create dora-atos index with Portuguese analyzer mappings
echo "Creating 'dora-atos' index..."
curl -sf -X PUT "${ES_HOST}/dora-atos" -H "Content-Type: application/json" -d '{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "analysis": {
      "analyzer": {
        "portuguese_custom": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": [
            "lowercase",
            "portuguese_stop",
            "portuguese_stemmer",
            "asciifolding"
          ]
        }
      },
      "filter": {
        "portuguese_stop": {
          "type": "stop",
          "stopwords": "_portuguese_"
        },
        "portuguese_stemmer": {
          "type": "stemmer",
          "language": "portuguese"
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "fonte_id": { "type": "keyword" },
      "edicao_id": { "type": "keyword" },
      "tipo": { "type": "keyword" },
      "titulo": {
        "type": "text",
        "analyzer": "portuguese_custom",
        "fields": {
          "keyword": { "type": "keyword", "ignore_above": 512 }
        }
      },
      "ementa": {
        "type": "text",
        "analyzer": "portuguese_custom"
      },
      "conteudo": {
        "type": "text",
        "analyzer": "portuguese_custom"
      },
      "orgao": {
        "type": "text",
        "analyzer": "portuguese_custom",
        "fields": {
          "keyword": { "type": "keyword", "ignore_above": 256 }
        }
      },
      "numero": { "type": "keyword" },
      "data_publicacao": { "type": "date" },
      "url_original": { "type": "keyword" },
      "created_at": { "type": "date" },
      "updated_at": { "type": "date" }
    }
  }
}' && echo ""

if [ $? -eq 0 ]; then
  echo "'dora-atos' index created successfully."
else
  echo "'dora-atos' index may already exist, skipping."
fi

# Create dora-edicoes index
echo "Creating 'dora-edicoes' index..."
curl -sf -X PUT "${ES_HOST}/dora-edicoes" -H "Content-Type: application/json" -d '{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "fonte_id": { "type": "keyword" },
      "numero": { "type": "keyword" },
      "data_publicacao": { "type": "date" },
      "url_original": { "type": "keyword" },
      "status": { "type": "keyword" },
      "total_atos": { "type": "integer" },
      "created_at": { "type": "date" },
      "updated_at": { "type": "date" }
    }
  }
}' && echo ""

if [ $? -eq 0 ]; then
  echo "'dora-edicoes' index created successfully."
else
  echo "'dora-edicoes' index may already exist, skipping."
fi

echo "Elasticsearch initialization complete."
