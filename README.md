## Introduction

- This is a simple ChatGPT clone. You can put your OpenAI API key and use it in the same way as ChatGPT. 

- I saw an example of an implementation of a very simple ChatGPT clone on Twitter and I thought I could make it too and I started it.

- This app isn't free, but sometimes the API becomes very slow and I don't know why. 

## Features

- Threads are automatically saved in each category. (ChatGPT classifies them.)

- You can change the system message, categories, model, max token number.

## How to use

- Category feature

  - Add: `/category add [name]`
  
  - Modify: `/category modify [previous name] [new name]`
  
  - Delete: `/category delete [name]`
  
- System message(*This is a direction message to ChatGPT. It will be provided to ChatGPT API at every turn) feature

  - Show: `/system --show`
  
  - Change: `/system [new message]`
  
- API key change

  - `/api_key [new API key]`
  
- Model feature

  - Show: `/model --show`
  
  - Change: `/model [new model name]`
  
- Max token number feature

  - Show: `/max_token --show`
  
  - Change: `/max_token [new number]`
