/*
 * 黔算智能体 · 中文补全覆写层
 *
 * 这个文件是**生成物**，不要手改：改译文请改译文源数据后重跑
 * `qiansuan/scripts/build-zh-overlay.py`。
 *
 * ⚠️ 两条不能动的规矩：
 * 1. **必须合并到 `zh` 之上**，不能合并到 `en` 之上。
 *    上游的 `defineLocale(overrides)` 是 `mergeTranslations(en, overrides)`，
 *    照抄它会把我们没碰的几千条中文**静默回退成英文**（P-03 陷阱）。
 * 2. 只允许填 `zh` 缺失（回落到英文）的键。`_qiansuan-overlay.test.ts`
 *    会正向断言这一点——如果哪天它报红，说明上游自己补上了，我们该删掉对应覆写。
 */
import { mergeTranslations, type TranslationOverride } from '@hermes/shared/i18n'

import type { Translations } from './types'
import { zh } from './zh'

/** 只覆盖 `zh` 里缺的那 285 条（其余一律沿用上游译文）。 */
const overrides: TranslationOverride<Translations> = 
{
  assistant: {
    approval: {
      commandDetails: "命令详情",
      openSafetySettings: "打开安全设置",
      timedOutSystemLine: "授权确认超时，命令没有执行。这不是故障，让黔算智能体再试一次即可；也可以到 设置 → 安全 → 授权确认超时 里调长等待时间。"
    },
    thread: {
      errorChooseModel: "请先选择模型",
      errorCodes: {
        SESSION_NOT_OWNED: {
          body: "这条对话正在另一个黔算智能体窗口或终端里打开，同一时间只能在一处使用。到那边关闭它，再回来重新发送；或者在这里新建一条对话。",
          title: "这条对话已在别处打开"
        },
        billing: {
          title: "额度已用完"
        },
        context_overflow: {
          body: "这条对话太长，已经超出模型能处理的范围。压缩这条对话，或新建一条对话后再发送。",
          title: "这条对话太长了"
        },
        disk_full: {
          body: "磁盘空间满了，黔算智能体没法保存这条对话。清理出一些空间后再重试即可。",
          title: "磁盘空间已满"
        },
        free_tier_at_capacity: {
          body: "登录账号即可免排队，也可以稍等片刻再试。",
          title: "未登录聊天当前较为繁忙"
        },
        free_tier_disabled: {
          body: "登录账号后即可继续聊天。",
          title: "黔算智能体暂不支持未登录使用"
        },
        free_tier_model_not_free: {
          body: "黔算智能体暂时只能使用免费模型，登录账号后可以使用更多模型。",
          title: "该模型需要登录后才能使用"
        },
        free_tier_outage: {
          body: "请稍等片刻，再重新发送一次消息。",
          title: "免费模型暂时无法正常回复"
        },
        free_tier_rate_limited: {
          body: "额度很快会恢复，登录账号可以获得更多额度。",
          title: "未登录聊天的额度已用完"
        },
        free_tier_refused: {
          body: "登录账号即可继续使用。",
          title: "未登录状态下无法发送该消息"
        },
        free_tier_route: {
          body: "请登录账号，或检查 NOUS_INFERENCE_BASE_URL 设置。",
          title: "黔算智能体无法通过当前线路连接免费模型"
        },
        loop_error: {
          body: "回复一直在重复同样的步骤，黔算智能体主动把它停掉了。点重试即可；如果再次出现，就新建一条对话。",
          title: "黔算智能体卡在循环里了"
        },
        model_not_found: {
          title: "这个模型当前不可用"
        },
        no_reply: {
          body: "黔算智能体这一轮没有给出回复就结束了。点重试，再发送一次即可。",
          title: "回复未完成"
        },
        payload_too_large: {
          body: "这次发送的内容太大，模型处理不了。压缩这条对话，或新建一条对话后再发送。",
          title: "这条消息太大了"
        },
        stream_drop: {
          body: "网络连接在中途断开，回复没能传完，不是你的操作问题。点重试，再发送一次即可。",
          title: "回复中途断了"
        },
        truncated: {
          body: "模型在回复完成前停止了。请重试，以获取完整的回复。",
          title: "回复没说完就停了"
        },
        upstream_blocked: {
          title: "请求被防火墙拦下了"
        }
      },
      errorCompressConversation: "压缩对话",
      errorCompressFailed: "对话压缩没有成功，可以先新建一条对话继续。",
      errorLayerBodies: {
        auth: "你的登录验证未通过。请检查该模型服务商的凭据（如 API 密钥或账号信息），更新后重新发送。",
        billing: "这个模型服务商的额度已用完。充值，或换一个模型服务商后再发一次。",
        disk: "磁盘空间满了，黔算智能体没法保存这条对话。清理出一些空间后再重试即可。",
        gateway: "黔算智能体在开始生成这条回复时遇到了内部问题，不是你的操作造成的。先重新发送一次；如果反复出现，请发送诊断信息。",
        runtime: "黔算智能体在开始生成这条回复时遇到了内部问题，不是你的操作造成的。先重新发送一次；如果反复出现，请发送诊断信息。"
      },
      errorOpenHermesFolder: "打开配置文件夹",
      errorOpenHermesFolderFailed: "没能打开配置文件夹。你可以手动打开，路径为 ~/.hermes。",
      errorSignInFreeTier: "登录账号",
      errorToastTitle: "黔算智能体没能完成回复",
      errorUpdateApiKey: "更新 API 密钥",
      responseStopped: "回复已停止"
    }
  },
  boot: {
    causes: {
      diskFull: "磁盘空间满了，黔算智能体无法启动。",
      exitedEarly: "黔算智能体的后台服务刚启动就退出了。",
      installMissing: "黔算智能体的部分安装文件缺失了，选「修复安装」就能补回来。",
      permission: "黔算智能体无法写入自己的数据文件夹，这是权限问题，不是你的操作造成的。",
      portInUse: "有别的程序占用了黔算智能体需要的网络端口。关闭占用该端口的程序，或重启电脑，通常可以解决。",
      timedOut: "黔算智能体的后台服务没有在限定时间内响应，请重启应用再试。"
    },
    errors: {
      connectionSettings: "连接设置",
      gatewaySignInRequiredDetail: "重新登录后即可恢复连接，你的聊天记录和设置都还在。",
      openLogs: "查看日志",
      reconnectNow: "立即重连",
      restartHermes: "重启应用",
      signInAgain: "重新登录"
    },
    updateHold: {
      checkAgain: "重新检查",
      confirmBody: "上一个更新进程可能还在改动黔算智能体的文件。现在强行启动，会加载一个只更新到一半的版本，在重新完成更新之前可能无法正常使用。黔算智能体会把这次选择记进日志，并保留更新标记。",
      confirmKeepWaiting: "继续等待",
      confirmStart: "仍要启动",
      confirmTitle: "更新还没结束，要现在启动黔算智能体吗？",
      description: "黔算智能体暂时不启动，是为了避免加载更新还没改完的文件；等待一结束，它会自己启动。",
      heldUnknown: "更新程序已退出，但它启动的进程还占着黔算智能体的安装文件。",
      openLogs: "查看日志",
      quit: "退出应用",
      recoveryHint: "这个问题通常几分钟内会自动解除。如果一直没解除：先退出黔算智能体，在任务管理器里结束残留的 git 或 hermes 进程（或者直接重启电脑），再重新打开黔算智能体。",
      startAnyway: "仍要启动…",
      startAnywayRefused: "启动前，占用安装文件的进程又变了。请查看最新情况后再试一次。",
      title: "上一次更新还在占用黔算智能体",
      titleUnverified: "黔算智能体无法确认上次更新是否完成",
      unverified: "更新辅助程序暂时查不清是谁在占用黔算智能体的安装文件，黔算智能体会继续检查。"
    }
  },
  composer: {
    hiddenQueued: "设置说明"
  },
  connectors: {
    checking: "正在检查你的应用…"
  },
  connectorsPage: {
    add: {
      action: "自己添加",
      addArg: "+ 添加参数",
      addEnvVar: "+ 添加环境变量",
      addHeader: "+ 添加请求头",
      addPassthrough: "+ 添加变量",
      authBearer: "Bearer 凭证",
      command: "启动命令",
      cwd: "工作目录",
      editJson: "编辑 mcp.json",
      envVars: "环境变量",
      hint: "在这台设备的 mcp.json 里新增一项",
      nameTaken: "这个名字已经用过了，换一个吧。",
      passthrough: "传递环境变量",
      pasteLabel: "粘贴命令或片段",
      pasteNoMatch: "这里没识别出服务器，请改在下方手动填写。",
      pastePlaceholder: "npx -y @modelcontextprotocol/server-filesystem /path/to/dir",
      removeRow: "移除这一行",
      saveFailed: "这个服务器没有保存成功，请再存一次。",
      title: "连接自定义 MCP",
      typeHttp: "Streamable HTTP"
    },
    card: {
      alsoLocal: "本机也能运行",
      hostedTwin: "另有托管版",
      inCatalog: "应用库收录",
      kindCatalog: "MCP · 应用库",
      kindCustom: "MCP · 自定义",
      reason: {
        finishSignIn: "请在浏览器里完成登录。",
        reconnect: "重新连接，这个应用才能继续用。",
        serverError: "服务端拒绝了这次连接，请稍后再试；如果反复出现，请检查连接设置。",
        serverNeedsAuth: "登录后这个服务器才能正常工作。"
      },
      state: {
        accessExpired: "授权已过期",
        connectionUnknown: "状态未知",
        couldNotConnect: "连接失败",
        offByYourOrganisation: "已由组织关闭",
        offForYou: "已对你关闭",
        serverNeedsAuth: "需要登录",
        serverOnUnused: "已开启未使用"
      },
      verb: {
        openLogs: "打开日志",
        stopWaiting: "停止等待",
        tryAgain: "重试",
        turnBackOn: "重新开启"
      }
    },
    categoryAll: "全部分类",
    dialog: {
      advancedHint: "mcp.json 里的记录和日志",
      connectEnded: "登录没有完成，请回到浏览器再试一次。",
      connectOpenAgain: "重新打开链接",
      disconnectBody: "黔算智能体会停止以这个账号的身份操作。你随时都能重新连接。",
      menuRefreshTools: "刷新工具",
      moreActions: "更多操作",
      nousLine: "这些应用跟着你的账号走，不跟配置方案走。",
      openPlugins: "打开插件页",
      orgLink: "应用连接管理",
      removeServerBody: "这条记录会从这台电脑的 mcp.json 里移除，其它东西都不会删。",
      rulesReadOnly: "规则暂时不能修改，请稍后再试。",
      rulesSignIn: "登录后才能修改黔算智能体在这里可以做的事。",
      tokensPerCall: "每次调用额度",
      turnOffLocal: "关闭本机服务器",
      usesPerMonth: "30 天内使用次数"
    },
    group: {
      connectedNote: "先显示有问题的连接。",
      off: "已关闭",
      offNote: "登录信息会保留。"
    },
    page: {
      clearSearch: "清除搜索",
      disconnectNoAccount: "黔算智能体这里没有可解除的账号。刷新页面后再试一次。",
      disconnectRefused: "现在没法解除这次登录。可以先用开关把这个应用关掉，或者稍后再试。",
      emptyTitle: "这里还没有应用，先加一个本机服务器吧。",
      freeTierNote: "登录之前，连接都只留在这台电脑上。",
      hostedFailedBody: "这台电脑上的服务器不受影响，仍在正常运行，没有任何东西被关掉。",
      hostedFailedTitle: "连不上托管应用。",
      loading: "正在读取应用库和这台电脑上的服务器",
      managedUnavailable: "这个账号暂时还不能使用托管应用。",
      noMatchBody: "没有匹配的内容。让黔算智能体连上你自己的 MCP 服务器就能添加。",
      noMatchTitle: "没有匹配的应用",
      refreshFailed: "工具列表没有刷新成功，请再试一次。",
      showAllMatches: "显示全部匹配",
      signIn: "登录",
      signInLine: "登录后即可使用托管应用。",
      writeFailed: "这次修改没有保存成功，请再试一次。"
    },
    residencyLocal: "在这台设备上",
    segment: {
      off: "已关闭"
    },
    tools: {
      allToolsSwitch: "工具总开关",
      conflictReload: "加载对方的版本",
      conflictSave: "覆盖对方的版本",
      conflictTitle: "你编辑的时候，有人改过这条规则。",
      goneBody: "黔算智能体已经无法调用它了。这一行会保留到你手动删除，不会凭空消失。",
      loading: "正在读取工具列表",
      lockedHint: "已由组织关闭",
      needsAuthBody: "登录信息只留在这台电脑上，不会传出去。",
      noMatch: "没有符合这些筛选条件的工具。",
      notInstalledBody: "在这台设备上安装后，就能看到它带来的工具。",
      offBody: "打开上面的开关，就能看到它带来的工具。",
      quickEverythingOn: "全部开启",
      quickNoDestructive: "关闭危险操作",
      quickReadOnly: "仅可读取",
      save: "保存修改",
      saveFailed: "这些工具规则没有保存成功，请再试一次。",
      showSummary: "显示摘要",
      signedOutBody: "这台电脑上你自己的服务器不受影响。",
      signedOutTitle: "登录后即可查看工具列表。",
      staleSignIn: "登录后即可查看最新的工具列表。",
      summaryAllOn: "全部开启",
      summaryAllTools: "全部工具",
      unavailableLine: "工具列表暂时不可用。"
    },
    vocabulary: {
      facetDestructive: {
        long: "会把这个应用里的东西彻底删掉。"
      },
      facetRead: {
        long: "只从这个应用读取数据，不会改动任何东西。"
      },
      facetUnclassified: {
        label: "影响未知",
        long: "这个应用没有说明这个工具会做什么。"
      },
      facetWrite: {
        long: "会在这个应用里新建或改动内容。"
      },
      hintCreate: {
        long: "会新建内容。"
      },
      hintDelete: {
        long: "会删除内容。"
      },
      hintDestructive: {
        long: "它造成的改动在这里无法撤销。"
      },
      hintIdempotent: {
        long: "运行两次和运行一次的效果一样。"
      },
      hintOpenWorld: {
        long: "会访问这个应用之外的内容。"
      },
      hintReadOnly: {
        label: "仅可读取",
        long: "这个工具声明自己只读取数据。"
      },
      hintUpdate: {
        long: "会改动已经存在的内容。"
      }
    }
  },
  cron: {
    editJob: "编辑任务",
    lastRunFailed: "上次运行失败：",
    overdueSince: "已逾期，原定于",
    runAgain: "重新运行"
  },
  desktop: {
    handoff: {
      startMessaging: "开始聊天"
    }
  },
  errors: {
    sendDiagnostics: "发送诊断信息"
  },
  externalOpenFailed: {
    missing: {
      message: "这个文件不存在，可能已被删除或移动，也可能在另一台电脑上。",
      title: "找不到文件"
    }
  },
  fileMenu: {
    revealUnavailable: "这个路径不在本机上，文件在服务端所在的电脑上。请改用「在文件树中显示」。"
  },
  freeTier: {
    busyHeading: "快好了",
    setupFailed: {
      gateClosed: "这个版本的黔算智能体需要登录账号才能启动。登录或注册一个账号即可，一分钟就能搞定。",
      generic: "黔算智能体无法在未登录的情况下开通免费使用。可以登录账号，或接入其他模型服务商。",
      locked: "本次对话需要登录后才能继续。登录或注册一个账号即可接着用。",
      paused: "未登录使用黔算智能体暂时被暂停了，黔算智能体会在后台持续检查。登录账号就能立刻继续。",
      powRequired: "服务方要求进行工作量证明验证，但当前版本的黔算智能体还不支持。请登录或注册账号后继续。",
      retrying: "正在重试…",
      serverError: "服务方出了点小状况。请稍后点「重试」，或者先接入其他模型服务商。",
      signInBelow: "登录即可免费使用，请在下方选择登录。",
      tryAgain: "重试",
      unreachable: "黔算智能体连不上服务方。请检查网络连接后点「重试」，或者先接入其他模型服务商。"
    },
    unreachableBody: "黔算智能体连不上服务方，没法完成登录。请检查网络连接后重试，你的对话还在。"
  },
  handoffTour: {
    profileText: "这条竖栏用来切换配置方案。现在点亮的是默认方案，任务对话都在这里；另一个是初始化方案，欢迎对话在里面。",
    profileTitle: "第一个任务在默认配置方案里运行",
    sessionsText: "这个列表属于默认配置方案。新建对话会在当前选中的配置方案里开始。在竖栏上切换配置方案，列表也会跟着变。",
    sessionsTitle: "每个配置方案各有自己的对话",
    stayText: "需要帮忙时，随时切到初始化配置方案，打开「欢迎使用黔算智能体」，它一直都在。",
    stayTitle: "黔算智能体随点随开"
  },
  install: {
    openLogs: "打开日志"
  },
  keybinds: {
    actions: {
      "hud.snapToPointer": "把 HUD 移到鼠标位置（全局，HUD 打开时生效）",
      "view.closeTerminal": "关闭终端",
      "view.cycleSidebarGrouping": "切换对话分组方式",
      "view.newTerminal": "新建终端",
      "view.nextTerminal": "下一个终端",
      "view.prevTerminal": "上一个终端",
      "view.tabSlot.1": "切换到标签页 1",
      "view.tabSlot.2": "切换到标签页 2",
      "view.tabSlot.3": "切换到标签页 3",
      "view.tabSlot.4": "切换到标签页 4",
      "view.tabSlot.5": "切换到标签页 5",
      "view.tabSlot.6": "切换到标签页 6",
      "view.tabSlot.7": "切换到标签页 7",
      "view.tabSlot.8": "切换到标签页 8",
      "view.tabSlot.9": "切换到标签页 9",
      "view.toggleHud": "切换 HUD 模式"
    }
  },
  messaging: {
    fieldCopy: {
      MATRIX_HOMESERVER: {
        label: "主服务器 URL"
      }
    },
    openLogs: "打开日志",
    restartAgain: "再次重启",
    restartFailedManualDetail: "请点「再次重启」；如果还是失败，打开日志并发送诊断信息。"
  },
  notifications: {
    actions: {
      openGateways: "打开服务端",
      openKeys: "打开密钥",
      openMaintenance: "打开维护",
      restartHermes: "重启黔算智能体"
    },
    compressDeferredDone: "上下文压缩完成",
    errors: {
      restartHermesFailed: "无法重启黔算智能体",
      rpcOutOfSync: "应用和服务端的版本对不上，请把两边都更新到最新。",
      storageFailure: "黔算智能体无法写入自己的数据文件夹，请打开「维护」检查并修复。"
    }
  },
  onboarding: {
    tryAgain: "重试",
    useApiKeyInstead: "使用 API 密钥",
    apiKeyOptions: {
      local: {
        short: "自定义 API（OpenAI 兼容）",
        description: "填入中转站 API 地址和你的 API Key，点连接后会自动获取可用模型。"
      }
    },
    localModelNamePlaceholder: "模型名称（例如 glm-5.3）"
  },
  preview: {
    missingTarget: "这个路径在本机上不存在"
  },
  sendDiagnostics: {
    links: {
      github: "GitHub Issues"
    }
  },
  settings: {
    connections: {
      kindCloud: "黔算智能体云端"
    },
    gateway: {
      cloudSignInTitle: "黔算智能体云端",
      cloudTitle: "黔算智能体云端"
    },
    model: {
      mainAppliedTitle: "主模型已更新"
    },
    toolsets: {
      nousAuthFailedMessage: "请重试。",
      nousAuthTryAgain: "重试",
      postSetupOpenLogs: "打开日志",
      postSetupRunAgain: "重新运行",
      terminalBackend: {
        openBackendSettings: "打开终端设置",
        switchedToLocal: "终端命令现在改在本地运行，对新对话生效。",
        unavailableTitle: "终端命令暂不可用",
        useLocal: "使用本地终端"
      }
    }
  },
  shell: {
    statusbar: {
      toggleFreeTier: "免费额度"
    }
  },
  sidebar: {
    storageCorrupt: {
      action: "请先退出这个配置方案里的黔算智能体，然后检查文件（不要改动它），或者恢复快照：",
      guide: "恢复指南",
      title: "对话数据库已损坏"
    }
  },
  skills: {
    hub: {
      openLog: "打开日志",
      viewScan: "查看扫描"
    },
    plugins: {
      serverStates: {
        app_not_running: "应用未运行",
        connected: "已连接",
        endpoint_unavailable: "服务地址不可用",
        hermes_not_connected: "缺少 MCP 连接",
        missing_app: "缺少应用",
        no_interactive_session: "没有交互式对话",
        unknown: "状态未知",
        unsupported_gpu: "不支持当前 GPU",
        version_too_old: "版本过旧"
      },
      settingsForm: {
        save: "保存设置"
      },
      updateConsentConfirm: "确认更新"
    }
  },
  updates: {
    connectionSettings: "连接设置",
    openDownloadPage: "打开下载页面",
    versionDetailsDistributionStore: "Microsoft Store"
  },
  webhooks: {
    webhookUrl: "Webhook 地址"
  }
}

export const zhQiansuan: Translations = mergeTranslations<Translations>(zh, overrides)
