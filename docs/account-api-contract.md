# 账号增删改查接口约定

前后端已实现新增、编辑、删除与服务端分页查询。

| 操作 | 请求 | 成功 HTTP 状态 | data |
| --- | --- | --- | --- |
| 查询列表 | GET /api/accounts | 200 | AccountPageVO 分页对象 |
| 新增账号 | POST /api/accounts | 201 | 新账号 ID |
| 修改账号 | PUT /api/accounts?id=10 | 200 | null |
| 删除账号 | DELETE /api/accounts?id=10 | 200 | null |

所有成功响应沿用 `Result<T>`：`{"code":0,"message":"success","data":null}`。
删除也返回 JSON，当前约定不使用 204 空响应。
校验失败返回 HTTP 400；目标不存在返回 HTTP 404；响应体使用非零 code、可读 message 和 null data。

新增和修改的请求体都只有以下六个字段：

```json
{
  "systemName": "演示系统",
  "environment": "test",
  "username": "demo",
  "password": "fictional-password",
  "loginUrl": "https://example.com/login",
  "remark": "仅供学习"
}
```

PUT 提交完整表单：密码为空表示清空密码，不表示保留旧密码；密码空格原样保留。
ID 使用查询参数 `?id=10` 传递，由 `@RequestParam("id")` 绑定；必须是正整数，缺失或非法时返回 HTTP 400。
前端校验方便用户操作，不能代替后端 DTO 和查询参数校验。
后端修改不存在的账号应返回 404；修改为相同值应成功，不能仅凭数据库的“变化行数为 0”认定不存在。

## 分页查询

`GET /api/accounts?page=1&pageSize=10&keyword=demo&environment=test`

- `page` 默认 1，必须为正整数；超过最后一页时返回最后有效页，空列表返回第 1 页。
- `pageSize` 默认 10，只接受 5、10、50。
- `keyword` 可选，去除首尾空格后在系统名、用户名、备注中搜索，忽略大小写；`%`、`_` 作为普通文字。
- `environment` 可选，不传表示全部；与关键词同时生效。
- 参数格式或校验错误返回 HTTP 400。

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "records": [],
    "total": 0,
    "page": 1,
    "pageSize": 10,
    "stats": { "totalAccounts": 0, "systemCount": 0, "testCount": 0 },
    "environments": []
  }
}
```

`records` 中每项仍为 AccountVO；`total` 是筛选后的总条数。
`stats` 为全部账号的统计，`environments` 为全部已保存环境，均不随当前筛选或页码缩小。
账号按照 ID 降序排列。并发新增/删除后刷新会重新计算分页，不提供跨请求的快照。

**升级需协调前后端发布**：GET 的 `data` 已从数组改为分页对象，旧版前端与新版后端不兼容。

## 前端交互

- 搜索和环境筛选由服务端执行，再分页；搜索输入防抖 300ms，并取消旧请求。
- 默认每页 10 条，可选 5、10、50 条；切换条数、搜索或环境时回到第一页。
- 编辑后保留筛选和页码；新增后清空筛选并回第一页；删除后采用服务端修正的页码。
- 编辑使用表单副本；取消编辑不修改列表内容。
- 删除确认框显示系统、用户名和环境，不显示密码；取消不发送请求。
- 保存、删除时禁止重复提交；只有服务端返回成功才关闭弹窗并刷新列表。
- 失败保留弹窗和输入。连接中断时提示先刷新核实结果，不自动重发写请求。

## 后端学习路线

1. 删除：Mapper 的参数绑定和影响行数 → Service 的不存在处理 → Controller 的查询参数校验。
2. 测试：分别检查删除成功、重复删除、非法 ID，并验证其他记录不受影响。
3. 修改：Update DTO → Mapper → Service → Controller；练习完整更新、字段校验和不存在处理。
4. 测试：非法请求不得改变数据库；相同内容可重复提交；只允许更新指定账号。
5. 分页：查询 DTO → COUNT + LIMIT/OFFSET → 分页 VO；理解筛选总数和全局统计的区别。

联调只操作明确创建的虚构测试账号。
