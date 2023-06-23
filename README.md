# com_mapping-service-input



This is a webcomponent to use in HTML or more complex web projects.


## Integration

If the dependency is up set properly (instructions will follow), the component can be used like this:

```html
<head>
     ...
    <!-- use the code !-->
     <script src="https://cdn.jsdelivr.net/npm/@kit-data-manager/mapping-service-input@latest/dist/com_mapping-service-input.es.js"></script>
</head>
<body>
    <!-- use the component !-->
    <mapping-input base-url="http://localhost:8090/" id="input-component"></mapping-input>
</body>
```

## Attributes

- `base-url`: string, base-url to your Mapping Service instance


## Methods
- `executeMapping(true)`: To trigger the mapping process, you can include the following HTML code in your project:
 (true in the method argument will trigger mapping + download of the result)

```html
 ...
    <!-- use the method !-->

`<div class="ui center aligned grid">
  <button type="submit" class="ui primary button" id="submit" onclick="
    var component = document.getElementById('input-component');
    component.executeMapping(true)">Map document
  </button>
</div>`

```



  