<template>
  <h1>Test Vue File for Vue Template Organizer</h1>
  <CustomComp :id="comp1Id" class="class1" @click="testfnc"></CustomComp>
  <CustomComp2 @click="testfnc"></CustomComp2>
  <p class="par">Just a simple Test</p>
  <label for="txtinput">Your input here</label>
  <div v-if="1 == true"></div>
  <svg
    v-else
    class="h-6 w-6"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
  <input id="txtinput" class="input-c" type="text" ref="myRef" />
</template>

<script setup lang="ts">
const comp1Id = "testID"

const myRef = ref(null)

function testfnc() {
  // dummy
}
</script>

<style scoped>
.class1 {
  position: fixed;
  z-index: 1;
  top: 1rem;
  display: block;
  border: 1px solid black;
  border-radius: 6px;
  width: 450px;
  height: 200px;
  font-size: 14px;
}
.par {
  color: blue;
}
</style>
