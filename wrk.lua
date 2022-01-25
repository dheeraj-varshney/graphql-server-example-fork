-- example HTTP POST script which demonstrates setting the
-- HTTP method, body, and adding a header

wrk.method = "POST"
wrk.body   = '{"query":"query Test{testRequest{success}}"}'
wrk.headers["Content-Type"] = "application/json"
