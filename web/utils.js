const getColumns = (arr) => {
  const columns = new Set()
  arr.forEach(el => { Object.keys(el).forEach((name) => columns.add(name)) })
  return [...columns];
}

const updateParam = (name, value) => {
  const searchParams = new URLSearchParams(document.location.search)
  if (value) {
    searchParams.set(name, value)
  } else {      
    searchParams.delete(name)
  }
  const location = document.location
  history.pushState({}, name, '?' + searchParams.toString())
}

const same = (arr1, arr2) => {
  if (arr1.length != arr2.length) {
    return false
  }
  for (let i in arr1) {
    if (arr1[i] != arr2[i]) {
      return false
    }
  }
  return true
}
