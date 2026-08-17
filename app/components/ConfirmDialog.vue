<script setup lang="ts">
import { useConfirm } from '~/composables/useConfirm'

const { request, settle } = useConfirm()
</script>

<template>
  <!-- подтверждение стоит первым: по 10.1 фокус уходит на первый интерактивный элемент, и Enter должен подтверждать -->
  <BaseModal v-if="request" :title="request.title" :text="request.text" @close="settle(false)">
    <BaseButton :variant="request.danger ? 'danger' : 'primary'" @click="settle(true)">
      {{ request.confirmLabel }}
    </BaseButton>
    <BaseButton variant="secondary" @click="settle(false)">
      {{ request.cancelLabel }}
    </BaseButton>
  </BaseModal>
</template>
