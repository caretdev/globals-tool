Class caretdev.Globals.API Extends %CSP.REST
{

Parameter CONTENTTYPE = {..#CONTENTTYPEJSON};

XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>

<Route Url="/namespaces" Method="GET" Call="GetNamespaces" Cors="true"/>
<Route Url="/globals/(.*)" Method="GET" Call="GetGlobals" Cors="true"/>
<Route Url="/data" Method="POST" Call="GetData" Cors="true"/>
<Route Url="/size" Method="POST" Call="GetSize" Cors="true"/>

</Routes>
}

ClassMethod outputStatus(pSC As %Status) As %Status
{
  Set result = {
    "status": "OK"
  }
  If ($$$ISERR(pSC)) {
    Do $System.Status.DecomposeStatus(pSC, .errors)
    If $Data(errors(1)) {
      Set code = errors(1, "code")
      Set error = $Piece(errors(1), "#" _ code _": ", 2, *)
      Set result.code = code
      Set result.status = error
    }
  }
  Do result.%ToJSON()
  Return $$$OK
}

ClassMethod ReportHttpStatusCode(pHttpStatus, pSC As %Status = {$$$OK}) As %Status
{
  Set %response.Status=pHttpStatus

  If $$$ISERR(pSC) {
    Do ..outputStatus(pSC)
  }
  Else {
    Set result = {
      "status": (pHttpStatus)
    }
    Do result.%ToJSON()
  }

  Return $$$OK
}

ClassMethod GetNamespaces() As %Status
{
  New $Namespace
  Set $Namespace = "%SYS"
  Set result = []
  Set tRS = ##class(Config.Namespaces).ListFunc()
  While tRS.%Next() {
    Continue:tRS.Namespace="%ALL"
    Set info = {}
    Set info.Namespace = tRS.Namespace
    Set info.Globals = tRS.Globals
    Do result.%Push(info)
  }
  Set tRS = ##class(SYS.Database).ListFunc()
  While tRS.%Next() {
    Set info = {}
    Set info.Namespace = "^^" _ tRS.Directory
    Set info.Size = +tRS.Size
    #; do info.%Set("Size", +tRS.Size, "boolean")
    Set info.Resource = tRS.Resource
    Do info.%Set("Mirrored", tRS.Mirrored, "boolean")
    Set info.StateInt = tRS.StateInt
    Do result.%Push(info)
  }
  Do result.%ToJSON()
  Return $$$OK
}

ClassMethod ReadParams(paramsList...) As %String
{
  Try {
    Set request = {}.%FromJSON(%request.Content)
  } Catch {
    Set request = {}
  }

  Set result = ""
  For i=1:1:paramsList {
    Set name = paramsList(i)
    Set value = %request.Get(name)
    Set value = request.%Get(name, value)
    Set result = result _ $ListBuild(value)
  }
  
  Quit result
}

ClassMethod GetGlobals(namespace) As %Status
{
  Set mask = "*"
  Set ignoreHasData = 0
  Set $ListBuild(system, mapped) = ..ReadParams("system", "mapped")
  Set:system="" system = 1
  Set:mapped="" mapped = 1

  Set result = []
  Set location = 0
  Set directory = $Extract(namespace, 3, *)
  If $Extract(namespace, 1, 2) = "^^" {
    Set tRS = ##class(%SYS.GlobalQuery).DirectoryListFunc(directory, , mask, system, , ignoreHasData)
  } Else {
    Set tRS = ##class(%SYS.GlobalQuery).NameSpaceListFunc(namespace, mask, system, , , ignoreHasData, mapped)
    Set location = 1
  }

  While tRS.%Next() {
    Set info = {}
    Set global = "^" _ tRS.Name
    Set info.Name = global
    if location {
      Set directory = tRS.Location
      Set info.Location = tRS.Location
    }
    Set info.Size = $Get(^IRIS.Temp.GlobalsTool("Size", directory, global), -1)
    Set info.Collation = tRS.Collation
    Do result.%Push(info)
  }

  Do result.%ToJSON()
  Return $$$OK
}

ClassMethod GetData()
{
  Set result = []
  Set $ListBuild(mask, namespace, max, lastNode, search) = ..ReadParams("mask", "namespace", "max", "lastNode", "search")
  Set:max="" max=50

  set nameFormat = 1
  set valueFormat = 2
  if search'="" {
    set startNode = $select(lastNode="": mask, 1: lastNode)
    Set tRS = ##class(%Global).FindFunc(namespace, startNode, search, 0, nameFormat, valueFormat)
  } else {
    Set tRS = ##class(%Global).GetFunc(namespace, mask, lastNode, nameFormat, valueFormat)
  }

  Set global = ""
  Set count = 0, hasMore = 0
  While tRS.%Next() {
    Set info = {}
    Set subs = []
    Set global = tRS.Name
    Do subs.%Push($QSubscript(global, 0))
    Set subsText = ""
    Set globalText = $QSubscript(global, 0)
    For i=1:1:$QLength(global) {
      Set val = $QSubscript(global, i)
      Set val = $$Format^%qcr(val, 17)
      Set subsText = subsText _ $ListBuild(val)
      Do subs.%Push(val)
    }
    If subsText'="" {
      Set globalText = globalText _ "(" _ $ListToString(subsText) _ ")"
    }
    Set globalText = $ZConvert(globalText, "O", "UTF8")
    Set info.Name = globalText
    Set value = tRS.Value
    Set value = $ZConvert(value, "O", "UTF8")
    Set info.Value = value
    Set info.Subscripts = subs
    Do result.%Push(info)
    Set count = count + 1
    If count>=max {
      Set hasMore = 1
      Quit
    }
  }

  Set wrapper = {
    "hasMore": (hasMore),
    "count": (count),
    "lastNode": (global),
    "items": (result)
  }

  Do wrapper.%ToJSON()
  Return $$$OK
}

/// @namespace
/// @global
ClassMethod GetSize() As %Status
{
  Set result = {}
  Set $ListBuild(directory, global) = ..ReadParams("directory", "global")
  Set size = 0
  Do ##class(%GlobalEdit).GetGlobalSizeBySubscript(directory, global, , .size)
  Set result = {
    "directory": (directory),
    "global": (global),
    "size": (size)
  }

  Set ^IRIS.Temp.GlobalsTool("Size", directory, global) = size

  Do result.%ToJSON()
  Return $$$OK
}

}
