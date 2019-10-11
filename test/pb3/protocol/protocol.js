{
  "nested": {
    "protocol": {
      "nested": {
        "Message": {
          "fields": {
            "id": {
              "rule": "required",
              "type": "int64",
              "id": 1
            },
            "type": {
              "rule": "required",
              "type": "string",
              "id": 2
            },
            "data": {
              "type": "string",
              "id": 3
            },
            "time": {
              "type": "int64",
              "id": 4
            },
            "context": {
              "type": "string",
              "id": 5
            }
          }
        },
        "Query": {
          "fields": {
            "id": {
              "rule": "required",
              "type": "int64",
              "id": 1
            },
            "action": {
              "rule": "required",
              "type": "string",
              "id": 2
            },
            "param": {
              "type": "string",
              "id": 3
            },
            "time": {
              "type": "int64",
              "id": 4
            },
            "priority": {
              "type": "int32",
              "id": 5
            },
            "context": {
              "type": "string",
              "id": 6
            }
          }
        }
      }
    }
  }
}