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
            },
            "phone": {
              "type": "string",
              "id": 3
            },
            "gender": {
              "type": "int32",
              "id": 4
            },
            "regtime": {
              "type": "int32",
              "id": 5
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
        "DataType": {
          "values": {
            "STRING": 0,
            "JSON": 1,
            "PB": 2
          }
        },
        "Data": {
          "fields": {
            "type": {
              "rule": "required",
              "type": "string",
              "id": 1
            },
            "loader": {
              "rule": "required",
              "type": "string",
              "id": 2
            },
            "string": {
              "type": "string",
              "id": 3
            },
            "buffer": {
              "type": "bytes",
              "id": 4
            }
          }
        },
        "Query2": {
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
              "type": "Data",
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
        },
        "Message2": {
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
              "type": "int64",
              "id": 4
            },
            "context": {
              "type": "string",
              "id": 5
            }
          }
        }
      }
    }
  }
}