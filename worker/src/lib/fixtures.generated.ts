// GENERATED from ../../fixtures.json — do not edit by hand; run `bun scripts/generate-fixtures.ts`.

export const rawFixtures = {
  "_readme": "Synthetic fixtures for the Chata order-intake agent. All names, numbers, and messages are made up. wa_id values are fake and prefixed 234800000 to make that obvious. Image test cases (case_03, case_13) include a 'screenshot_ocr_text' field standing in for the vision OCR output (OpenCode Go vision model) from a real payment screenshot — this lets you build and test the rest of the pipeline before wiring up an actual image. case_13 additionally carries an 'attachment.image_url' (synthetic PNG data URI); the OCR stage skips when OCR text is already present, so evals stay deterministic. action values used across expected_output: await_payment, confirm_order, flag_for_review, needs_clarification, cancel_order, no_order.",
  "store_catalog": [
    {
      "sku": "RICE_BAG",
      "name": "Rice (50kg bag)",
      "price_ngn": 45000,
      "stock": 12
    },
    {
      "sku": "EGGS_CRATE",
      "name": "Eggs (crate of 30)",
      "price_ngn": 3500,
      "stock": 20
    },
    {
      "sku": "BEANS_BUCKET",
      "name": "Beans (paint bucket)",
      "price_ngn": 8000,
      "stock": 15
    },
    {
      "sku": "GARRI_BAG",
      "name": "Garri (25kg bag)",
      "price_ngn": 15000,
      "stock": 0
    },
    {
      "sku": "OIL_5L",
      "name": "Vegetable oil (5L)",
      "price_ngn": 12000,
      "stock": 25
    },
    {
      "sku": "TOMATOES_BASKET",
      "name": "Tomatoes (basket)",
      "price_ngn": 9000,
      "stock": 8
    },
    {
      "sku": "SEMO_5KG",
      "name": "Semovita (5kg)",
      "price_ngn": 6500,
      "stock": 10
    },
    {
      "sku": "GAS_12KG",
      "name": "Cooking gas refill (12.5kg)",
      "price_ngn": 13500,
      "stock": 0
    }
  ],
  "payment_records": [
    {
      "id": "PMT001",
      "amount_ngn": 20000,
      "sender_ref": "GTB-887421",
      "timestamp": "2026-08-27T10:16:00Z",
      "matched": false
    },
    {
      "id": "PMT002",
      "amount_ngn": 10000,
      "sender_ref": "ZEN-114820",
      "timestamp": "2026-08-27T11:42:00Z",
      "matched": false
    }
  ],
  "test_cases": [
    {
      "id": "case_01_clean_order",
      "category": "happy_path",
      "customer": {
        "wa_id": "2348000000101",
        "name": "Ngozi A."
      },
      "conversation_history": [],
      "message": {
        "type": "text",
        "timestamp": "2026-08-27T09:12:00Z",
        "text": "Hi, I'd like 2 bags of rice and 1 crate of eggs please"
      },
      "expected_output": {
        "action": "await_payment",
        "order": {
          "items": [
            {
              "sku": "RICE_BAG",
              "quantity": 2
            },
            {
              "sku": "EGGS_CRATE",
              "quantity": 1
            }
          ],
          "total_ngn": 93500,
          "confidence": "high"
        },
        "payment_status": "unconfirmed",
        "flags": []
      },
      "notes": "Baseline happy path — clear, unambiguous order, plain English. Every version should get this right."
    },
    {
      "id": "case_02_typos",
      "category": "noisy_input",
      "customer": {
        "wa_id": "2348000000102",
        "name": "Bola O."
      },
      "conversation_history": [],
      "message": {
        "type": "text",
        "timestamp": "2026-08-27T09:20:00Z",
        "text": "2 bags of rise pls, and 1 crat eggs, thanx"
      },
      "expected_output": {
        "action": "await_payment",
        "order": {
          "items": [
            {
              "sku": "RICE_BAG",
              "quantity": 2
            },
            {
              "sku": "EGGS_CRATE",
              "quantity": 1
            }
          ],
          "total_ngn": 93500,
          "confidence": "high"
        },
        "payment_status": "unconfirmed",
        "flags": []
      },
      "notes": "Same order as case_01 but with typos — tests whether the baseline's naive parsing is robust to noisy text."
    },
    {
      "id": "case_03_order_with_payment_screenshot",
      "category": "payment_match",
      "customer": {
        "wa_id": "2348000000103",
        "name": "Adaeze O."
      },
      "conversation_history": [],
      "message": {
        "type": "image",
        "timestamp": "2026-08-27T10:17:00Z",
        "caption": "Order: 1 bucket beans, 1 oil (5L). Payment attached ✅",
        "attachment": {
          "filename": "PLACEHOLDER_payment_screenshot_1.jpg",
          "note": "Replace with a real synthetic screenshot before wiring up vision. Until then, use screenshot_ocr_text below as a stand-in for the vision extraction."
        },
        "screenshot_ocr_text": "Bank Transfer Successful\nAmount: NGN 20,000.00\nTo: Chata Stores\nRef: GTB-887421\n27 Aug 2026, 10:16"
      },
      "expected_output": {
        "action": "confirm_order",
        "order": {
          "items": [
            {
              "sku": "BEANS_BUCKET",
              "quantity": 1
            },
            {
              "sku": "OIL_5L",
              "quantity": 1
            }
          ],
          "total_ngn": 20000,
          "confidence": "high"
        },
        "payment_status": "matched",
        "matched_payment_id": "PMT001",
        "flags": []
      },
      "notes": "Order total (20,000) matches payment_records PMT001 exactly. Tests the payment-matching tool on a clean case before testing the mismatch in case_07."
    },
    {
      "id": "case_04_ambiguous_order",
      "category": "ambiguous",
      "customer": {
        "wa_id": "2348000000104",
        "name": "Femi K."
      },
      "conversation_history": [],
      "message": {
        "type": "text",
        "timestamp": "2026-08-27T09:30:00Z",
        "text": "Do you have rice?"
      },
      "expected_output": {
        "action": "needs_clarification",
        "order": null,
        "payment_status": "n/a",
        "flags": [
          "no_quantity_specified",
          "ambiguous_intent"
        ]
      },
      "notes": "Could be a stock inquiry or the start of an order — no quantity given. Baseline will likely guess a quantity; agent should ask rather than assume."
    },
    {
      "id": "case_05_out_of_stock",
      "category": "stock_check",
      "customer": {
        "wa_id": "2348000000105",
        "name": "Chidi E."
      },
      "conversation_history": [],
      "message": {
        "type": "text",
        "timestamp": "2026-08-27T09:45:00Z",
        "text": "I need 1 bag of garri today"
      },
      "expected_output": {
        "action": "flag_for_review",
        "order": {
          "items": [
            {
              "sku": "GARRI_BAG",
              "quantity": 1
            }
          ],
          "total_ngn": 15000,
          "confidence": "high"
        },
        "payment_status": "n/a",
        "flags": [
          "item_out_of_stock"
        ]
      },
      "notes": "GARRI_BAG stock is 0 in the catalog. Tests whether the agent actually calls the stock tool instead of assuming availability — the baseline (no tools) cannot catch this."
    },
    {
      "id": "case_06_non_order_question",
      "category": "not_an_order",
      "customer": {
        "wa_id": "2348000000106",
        "name": "Tunde S."
      },
      "conversation_history": [],
      "message": {
        "type": "text",
        "timestamp": "2026-08-27T09:50:00Z",
        "text": "What time do you close today?"
      },
      "expected_output": {
        "action": "no_order",
        "order": null,
        "payment_status": "n/a",
        "flags": []
      },
      "notes": "Not every inbound message is an order. Tests false-positive rate — does the agent invent an order where there isn't one?"
    },
    {
      "id": "case_07_payment_mismatch_adversarial",
      "category": "adversarial",
      "customer": {
        "wa_id": "2348000000107",
        "name": "Kemi J."
      },
      "conversation_history": [],
      "message": {
        "type": "image",
        "timestamp": "2026-08-27T11:43:00Z",
        "caption": "Sent payment for 2 crates eggs and 1 basket tomatoes",
        "attachment": {
          "filename": "PLACEHOLDER_payment_screenshot_2.jpg",
          "note": "Stand-in via screenshot_ocr_text below."
        },
        "screenshot_ocr_text": "Bank Transfer Successful\nAmount: NGN 10,000.00\nTo: Chata Stores\nRef: ZEN-114820\n27 Aug 2026, 11:42"
      },
      "expected_output": {
        "action": "flag_for_review",
        "order": {
          "items": [
            {
              "sku": "EGGS_CRATE",
              "quantity": 2
            },
            {
              "sku": "TOMATOES_BASKET",
              "quantity": 1
            }
          ],
          "total_ngn": 16000,
          "confidence": "high"
        },
        "payment_status": "mismatched",
        "matched_payment_id": "PMT002",
        "flags": [
          "payment_amount_mismatch"
        ]
      },
      "notes": "THE key challenging case. Order total is 16,000 but the matched payment record (PMT002) is only 10,000 — a shortfall of 6,000. A false 'confirmed' here is the costliest failure mode in the whole workflow: it means stock goes out against an underpayment. This is the case to feature in the video and the changelog."
    },
    {
      "id": "case_08_repeat_order_memory",
      "category": "memory",
      "customer": {
        "wa_id": "2348000000101",
        "name": "Ngozi A."
      },
      "conversation_history": [
        {
          "timestamp": "2026-08-27T09:12:00Z",
          "direction": "inbound",
          "text": "Hi, I'd like 2 bags of rice and 1 crate of eggs please"
        },
        {
          "timestamp": "2026-08-27T09:12:30Z",
          "direction": "outbound",
          "text": "Got it! 2x Rice (50kg bag), 1x Eggs (crate of 30) — total NGN 93,500. We'll confirm once payment is received."
        }
      ],
      "message": {
        "type": "text",
        "timestamp": "2026-08-28T08:05:00Z",
        "text": "Hi again, same as last time please"
      },
      "expected_output": {
        "action": "await_payment",
        "order": {
          "items": [
            {
              "sku": "RICE_BAG",
              "quantity": 2
            },
            {
              "sku": "EGGS_CRATE",
              "quantity": 1
            }
          ],
          "total_ngn": 93500,
          "confidence": "medium",
          "reconstructed_from_history": true
        },
        "payment_status": "unconfirmed",
        "flags": []
      },
      "notes": "Same customer as case_01, new day. Only resolves correctly if the agent has access to conversation_history — the baseline and a memory-less agent will fail this one. Expected confidence is \"medium\" per the extraction prompt rule (orders reconstructed from history are medium confidence)."
    },
    {
      "id": "case_09_multi_item_order",
      "category": "happy_path",
      "customer": {
        "wa_id": "2348000000109",
        "name": "Ifeoma R."
      },
      "conversation_history": [],
      "message": {
        "type": "text",
        "timestamp": "2026-08-27T10:02:00Z",
        "text": "3 bags rice, 2 crates eggs, 1 bucket beans, and 2 semovita please"
      },
      "expected_output": {
        "action": "await_payment",
        "order": {
          "items": [
            {
              "sku": "RICE_BAG",
              "quantity": 3
            },
            {
              "sku": "EGGS_CRATE",
              "quantity": 2
            },
            {
              "sku": "BEANS_BUCKET",
              "quantity": 1
            },
            {
              "sku": "SEMO_5KG",
              "quantity": 2
            }
          ],
          "total_ngn": 163000,
          "confidence": "high"
        },
        "payment_status": "unconfirmed",
        "flags": []
      },
      "notes": "Four items in one message. Tests whether extraction accuracy holds up as message complexity increases."
    },
    {
      "id": "case_10_cancellation",
      "category": "order_modification",
      "customer": {
        "wa_id": "2348000000110",
        "name": "Yusuf B."
      },
      "conversation_history": [
        {
          "timestamp": "2026-08-27T14:00:00Z",
          "direction": "inbound",
          "text": "1 semovita and 1 oil please"
        },
        {
          "timestamp": "2026-08-27T14:00:30Z",
          "direction": "outbound",
          "text": "Got it! 1x Semovita (5kg), 1x Vegetable oil (5L) — total NGN 18,500. We'll confirm once payment is received."
        }
      ],
      "message": {
        "type": "text",
        "timestamp": "2026-08-27T14:10:00Z",
        "text": "Please cancel that order, I don't need it again"
      },
      "expected_output": {
        "action": "cancel_order",
        "order": {
          "items": [
            {
              "sku": "SEMO_5KG",
              "quantity": 1
            },
            {
              "sku": "OIL_5L",
              "quantity": 1
            }
          ],
          "total_ngn": 18500,
          "confidence": "medium",
          "reconstructed_from_history": true
        },
        "payment_status": "n/a",
        "flags": []
      },
      "notes": "Tests handling of a follow-up message that refers back to a pending order rather than describing a new one. reconstructed_from_history is true per the extraction prompt rule (cancellations rebuild the order from history). Confidence \"medium\" per the extraction prompt rule (history-rebuilt orders)."
    },
    {
      "id": "case_11_pidgin",
      "category": "noisy_input",
      "customer": {
        "wa_id": "2348000000111",
        "name": "Blessing U."
      },
      "conversation_history": [],
      "message": {
        "type": "text",
        "timestamp": "2026-08-27T10:35:00Z",
        "text": "Abeg I wan order 3 basket tomato and 1 oil make dem bring am today"
      },
      "expected_output": {
        "action": "await_payment",
        "order": {
          "items": [
            {
              "sku": "TOMATOES_BASKET",
              "quantity": 3
            },
            {
              "sku": "OIL_5L",
              "quantity": 1
            }
          ],
          "total_ngn": 39000,
          "confidence": "medium"
        },
        "payment_status": "unconfirmed",
        "flags": []
      },
      "notes": "Realistic Nigerian Pidgin English. TOMATOES_BASKET stock is only 8, and this order requests 3 — still fulfillable, but worth noting how close to the limit it is. Good realism test for a Lagos-vendor use case."
    },
    {
      "id": "case_12_gibberish",
      "category": "edge_case",
      "customer": {
        "wa_id": "2348000000112",
        "name": "Unknown"
      },
      "conversation_history": [],
      "message": {
        "type": "text",
        "timestamp": "2026-08-27T12:00:00Z",
        "text": "😂😂 kjkjk asdkj?? 🙌"
      },
      "expected_output": {
        "action": "no_order",
        "order": null,
        "payment_status": "n/a",
        "flags": [
          "unintelligible_input"
        ]
      },
      "notes": "Robustness check — the agent should decline to guess rather than hallucinate an order from noise. Good case to show in trajectories: what does the agent do when it genuinely doesn't know?"
    },
    {
      "id": "case_13_screenshot_image_url",
      "category": "payment_match",
      "customer": {
        "wa_id": "2348000000113",
        "name": "Chidi O."
      },
      "conversation_history": [],
      "message": {
        "type": "image",
        "timestamp": "2026-08-27T12:30:00Z",
        "caption": "Order: 1 crate eggs, 1 semo 5kg. Transfer receipt attached",
        "attachment": {
          "filename": "PLACEHOLDER_payment_screenshot_2.png",
          "image_url": "data:image/png;base64,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AQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAoxDQAACMQkADADAKAQ0AwCgENAAAYdP/AGGt3oy9adnaAAAAAElFTkSuQmCC",
          "note": "Synthetic payment screenshot (PNG data URI; vision models require png/jpeg/webp, not svg). screenshot_ocr_text below is the cached vision output, so the eval stays deterministic — the OCR stage skips when pre-extracted text is present. To exercise live OCR end-to-end, replay this message with screenshot_ocr_text removed."
        },
        "screenshot_ocr_text": "Bank Transfer Successful\nAmount: NGN 10,000.00\nTo: Chata Stores\nRef: ZEN-114820\nDate: 27 Aug 2026, 11:42"
      },
      "expected_output": {
        "action": "confirm_order",
        "order": {
          "items": [
            {
              "sku": "EGGS_CRATE",
              "quantity": 1
            },
            {
              "sku": "SEMO_5KG",
              "quantity": 1
            }
          ],
          "total_ngn": 10000,
          "confidence": "high"
        },
        "payment_status": "matched",
        "matched_payment_id": "PMT002",
        "flags": []
      },
      "notes": "Exercises the OCR stage's image_url plumbing deterministically: payment evidence (ref ZEN-114820, NGN 10,000) matches PMT002 exactly, so the pipeline confirms. Mirrors case_03 but arrives with an image_url attachment."
    }
  ]
} as const
