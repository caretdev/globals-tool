Class caretdev.Globals.API Extends %CSP.REST
{

Parameter CONTENTTYPE = {..#CONTENTTYPEJSON};

Parameter CACHEGN = "^IRIS.Temp.GlobalsTool";

XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>

<Route Url="/namespaces" Method="GET" Call="GetNamespaces" Cors="true"/>
<Route Url="/globals" Method="POST" Call="GetGlobals" Cors="true"/>
<Route Url="/data" Method="POST" Call="GetData" Cors="true"/>
<Route Url="/free" Method="POST" Call="GetFree" Cors="true"/>
<Route Url="/size" Method="POST" Call="GetSize" Cors="true"/>
<Route Url="/export" Method="POST" Call="Export" Cors="true"/>

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
  Set %response.Status = pHttpStatus
  Set %response.ContentType = ..#CONTENTTYPEJSON

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
    Set info.Free = -2
    Do result.%Push(info)
  }
  Set tRS = ##class(SYS.Database).ListFunc()
  While tRS.%Next() {
    Set info = {}
    Set info.Namespace = "^^" _ tRS.Directory
    Set info.Size = +tRS.Size
    Set info.Free = $Get(@..#CACHEGN@("Free", tRS.Directory), -1)
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
    If $IsObject(value) {
      Set iter = value.%GetIterator()
      Set value = ""
      While iter.%GetNext(,.val) {
        Set value = value _ $ListBuild(val)
      }
    }
    Set result = result _ $ListBuild(value)
  }
  
  Quit result
}

ClassMethod GetGlobals() As %Status
{
  Set mask = "*"
  Set ignoreHasData = 0
  Set $ListBuild(namespace, system, mapped) = ..ReadParams("namespace", "system", "mapped")
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
    Continue:'tRS.HasData
    Set info = {}
    Set global = "^" _ tRS.Name
    Set info.Name = global
    If location {
      Set directory = tRS.Location
      Set info.Location = tRS.Location
    }
    Set info.Size = $Get(@..#CACHEGN@("Size", directory, global), -1)
    Set info.Collation = tRS.Collation
    #; Set info.HasData = tRS.HasData
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

  Set nameFormat = 1
  Set valueFormat = 2
  If search'="" {
    Set startNode = $Select(lastNode="": mask, 1: lastNode)
    Set tRS = ##class(%Global).FindFunc(namespace, startNode, search, 0, nameFormat, valueFormat)
  } Else {
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

  Set @..#CACHEGN@("Size", directory, global) = size

  Do result.%ToJSON()
  Return $$$OK
}

ClassMethod GetFree() As %Status
{
  Set result = {}
  Set $ListBuild(directory) = ..ReadParams("directory")
  Set free = 0
  Do ##class(%SYS.DatabaseQuery).GetDatabaseFreeSpace(directory, .free)
  Set result = {
    "directory": (directory),
    "free": (free)
  }

  Set @..#CACHEGN@("Free", directory) = free

  Do result.%ToJSON()
  Return $$$OK
}

ClassMethod Export() As %Status
{
  Set $ListBuild(namespace, globals, format, gzip) = ..ReadParams("namespace", "globals", "format", "gzip")

  Set ptr = 0
  While $ListNext(globals, ptr, global) {
    Set:$Extract(global)="^" global = $Extract(global, 2, *) 
    Set list(global _ ".gbl") = ""
  }  
  If format="xml" {
    Set currentNamespace = $Namespace
    Set $Namespace = namespace
    Set filename = ##class(%File).TempFilename("xml")
    If gzip {
      Set filename = filename _ ".gz"
    }
    Set tSC = ##class(%SYSTEM.OBJ).Export(.list, filename, "/nodisplay/diffexport")
    Set $Namespace = currentNamespace
    Set %response.ContentType = "text/xml"
  } Else {
    Set filename = ##class(%File).TempFilename("gof")
    Set tSC = ##class(%Global).Export(namespace, .list, filename,,, "/nodisplay/diffexport")
    Set %response.ContentType = "application/octet-stream"
    If gzip {
      Set fs1 = ##class(%Stream.FileBinary).%New()
      Set fs1.Filename = filename

      Set gofFile = filename
      Set filename = filename _ ".gz"
      Set fs2 = ##class(%Stream.FileBinaryGzip).%New()
      Set fs2.Filename = filename
      Do fs2.CopyFrom(fs1)
      Do fs2.%Save()
      Do ##class(%File).Delete(gofFile)
    }
  }
  Quit:$$$ISERR(tSC) tSC
  If gzip {
    Set %response.ContentType = "application/gzip"
  }
  Set fs = ##class(%Stream.FileBinary).%New()
  $$$QuitOnError(fs.LinkToFile(filename))

  Set %response.ContentLength = fs.Size
  Set filename = "globals" _ $ZStrip($ZDatetime($Horolog, 8), "*E'N") _ "." _ $Piece(filename, ".", 2 , *)
  Do %response.SetHeader("Content-Disposition", "attachment; filename=" _ filename)

  $$$QuitOnError(fs.OutputToDevice())
  Do ##class(%File).Delete(filename)

  Quit $$$OK
}

}
