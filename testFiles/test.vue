<template>
  <h1>Test Vue File for Vue Template Organizer</h1>
  <CustomComp class="class1" @click="testfnc" :id="comp1Id" />
  <CustomComp2 @click="testfnc" />
  <p class="par">Just a simple Test</p>
  <label for="txtinput">Your input here</label>
  <input type="text" class="input-c" id="txtinput" ref="myRef" />
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
