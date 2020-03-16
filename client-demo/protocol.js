{
  "nested": {
    "loader": {
      "nested": {
        "User": {
          "fields": {
            "id": {
              "rule": "required",
              "type": "int64",
              "id": 1
            },
            "name": {
              "rule": "required",
              "type": "string",
              "id": 2
            }
          }
        },
        "UserList": {
          "fields": {
            "list": {
              "rule": "repeated",
              "type": "User",
              "id": 1
            },
            "total": {
              "rule": "required",
              "type": "int32",
              "id": 2
            }
          }
        },
        "ChatWords": {
          "fields": {
            "room": {
              "type": "string",
              "id": 1
            },
            "name": {
              "type": "string",
              "id": 2
            },
            "words": {
              "type": "string",
              "id": 3
            }
          }
        }
      }
    },
    "protocol": {
      "nested": {
        "Data": {
          "fields": {
            "loader": {
              "rule": "required",
              "type": "string",
              "id": 1
            },
            "buffer": {
              "type": "bytes",
              "id": 2
            }
          }
        },
        "QueryContext": {
          "fields": {
            "clientId": {
              "type": "int64",
              "id": 1
            },
            "userId": {
              "type": "string",
              "id": 2
            }
          }
        },
        "MessageContext": {
          "fields": {
            "queryId": {
              "type": "int64",
              "id": 1
            },
            "channelName": {
              "type": "string",
              "id": 2
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
              "rule": "required",
              "type": "Data",
              "id": 3
            },
            "time": {
              "rule": "required",
              "type": "int64",
              "id": 4
            },
            "context": {
              "type": "QueryContext",
              "id": 5
            }
          }
        },
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
              "rule": "required",
              "type": "Data",
              "id": 3
            },
            "time": {
              "rule": "required",
              "type": "int64",
              "id": 4
            },
            "context": {
              "type": "MessageContext",
              "id": 5
            }
          }
        }
      }
    }
  }
}