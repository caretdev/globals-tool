Class caretdev.Globals.Installer Extends %Projection.AbstractProjection
{

Projection Reference As Installer;

ClassMethod CreateProjection(classname As %String, ByRef parameters As %String, modified As %String, qstruct) As %Status
{
  Do ..CreateApplications()
  Set xdata = ##class(%Dictionary.XDataDefinition).%OpenId($ClassName()_"||Data")
  If $isobject(xdata) {
    $$$QuitOnError(..UnPack())
  }

  Quit $$$OK
}

ClassMethod CreateApplications()
{
  Set namespace = $Namespace
  New $Namespace
  Set $Namespace = "%SYS"

  If '##class(Security.Applications).Get("/globals") {
    Quit $$$OK
  }

  Set params("NameSpace") = namespace
  Set params("Recurse") = 1

  Set cspdir = ##class(%File).NormalizeDirectory(##class(%File).SubDirectoryName($System.Util.InstallDirectory(),"csp"))
  Set cspdir = ##class(%File).NormalizeDirectory("globals", cspdir)
  Set params("Path") = cspdir

  Do ##class(%File).CreateDirectoryChain(cspdir)
  Do ##class(Security.Applications).Create("/globals", .params)

  Set params("DispatchClass") = "caretdev.Globals.API"
  Do ##class(Security.Applications).Create("/globals/api", .params)
}

ClassMethod RemoveProjection(classname As %String, ByRef parameters As %String, recompile As %Boolean, modified As %String, qstruct) As %Status
{
  If recompile {
    Quit $$$OK
  }
  New $Namespace
  Set $Namespace = "%SYS"

  Do ##class(Security.Applications).Delete("/globals")
  Do ##class(Security.Applications).Delete("/globals/api")

  QUIT $$$OK
}

ClassMethod Export(filename = "globals.xml") As %Status
{
  Do ..Pack()

  Do $System.OBJ.Export($ClassName() _ ".CLS", filename ,"/diffexport/exportversion=2017.2")

  Quit $$$OK
}

ClassMethod Pack() As %Status
{
  Set items = "caretdev.Globals.API.CLS,/globals/*"

  Set filename = ##class(%File).TempFilename("xml.gz")
  Set stream = ##class(%Stream.FileBinaryGzip).%New()
  Set stream.Filename = filename

  $$$QuitOnError($System.OBJ.ExportToStream(items, .stream, "/diffexport/exportversion=2017.2"))
  $$$QuitOnError(stream.%Save())

  Set gzip = ##class(%Stream.FileBinary).%New()
  $$$QuitOnError(gzip.LinkToFile(filename))

  Set xdata = ##class(%Dictionary.XDataDefinition).%New()
  Do xdata.parentSetObjectId($ClassName())
  Set xdata.Name = "Data"
  Set hash = $System.Encryption.SHA1HashStream(gzip)
  Set hashHex = ""
  For i=1:1:$Length(hash) {
    Set hashHex = hashHex _ $Translate($Justify($ZHex($Ascii(hash, i)), 2), " ", 0)
  }
  Set xdata.Description = hashHex

  Do gzip.Rewind()
  Set chunkSize = 22800
  While 'gzip.AtEnd {
    Set data = gzip.Read(chunkSize)
    Set base64 = $System.Encryption.Base64Encode(data)
    Do xdata.Data.WriteLine(base64)
  }
  $$$QuitOnError(xdata.%Save())

  Do ##class(%File).Delete(filename)

  Quit $$$OK
}

ClassMethod UnPack()
{
  Set xdata = ##class(%Dictionary.XDataDefinition).%OpenId($ClassName()_"||Data")
  Set hashHex = xdata.Description

  Set filename = ##class(%File).TempFilename("xml.gz")

  Set stream = ##class(%Stream.FileBinary).%New()
  $$$QuitOnError(stream.LinkToFile(filename))
  
  Set prev = ""
  Set chunkSize = 30400
  Do {
    Set data = prev
    If 'xdata.Data.AtEnd {
      Set data = data _ xdata.Data.Read()
    }
    Set data = $ZStrip(data, "*C")
    Set prev = $Extract(data, chunkSize + 1, *)
    Set data = $Extract(data, 1, chunkSize)
    Set chunk = $System.Encryption.Base64Decode(data)
    Do stream.Write(chunk)
  } While (prev'="")||('xdata.Data.AtEnd)
  Write !,"Size: ", stream.Size
  Do stream.%Save()

  Do $system.OBJ.Load(filename, "ck")

  Quit $$$OK
}

}
