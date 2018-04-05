import express = require('express')

export interface NtlmRequest extends express.Request {
    ntlm?: NtlmInfo
}

export interface NtlmInfo {
    DomainName: string 
    UserName: string
    Workstation: string
    push?: void
}
