// HƯỚNG DẪN CẬP NHẬT GOOGLE APPS SCRIPT
// 1. Mở file Google Sheets gốc của bạn (Link DL)
// 2. Chọn Tiện ích mở rộng > Apps Script
// 3. Sao chép và dán toàn bộ đoạn code dưới đây thay thế cho code cũ
// 4. Bấm "Triển khai" (Deploy) > "Quản lý bản triển khai" > Chỉnh sửa bản hiện tại chọn "Phiên bản mới" (New version).

function getColLetter(col) {
  var letter = "";
  while (col > 0) {
    var temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = (col - temp - 1) / 26;
  }
  return letter;
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var spreadsheetId = data.spreadsheetId;
    var sheetName = data.sheetName || 'CapNhatSDT';
    
    var ss = SpreadsheetApp.openById(spreadsheetId);
    
    if (action === "updatePhone") {
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(["STT", "Nhóm", "Ma_Khang", "Ten_Khang", "DCHI_KHANG", "DTHOAI_DVU CU", "DTHOAI_DVU MOI", "TGian_CAPNHAT", "Trạng Thái"]);
      }
      
      var lastRow = sheet.getLastRow();
      var stt = lastRow > 1 ? lastRow : 1; 
      
      var sdtCuStr = data.sdtCu ? "'" + data.sdtCu : "";
      var sdtMoiStr = data.sdtMoi ? "'" + data.sdtMoi : "";
      sheet.appendRow([
        stt,
        data.nhom,
        data.maKhang,
        data.tenKhang,
        data.diaChi,
        sdtCuStr,
        sdtMoiStr,
        data.thoiGian,
        data.trangThai
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Updated phone" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "updateStatus") {
      var sheet = ss.getSheetByName(sheetName || 'CapNhatSDT');
      if(!sheet) return ContentService.createTextOutput("Sheet not found");
      
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      
      var maKhangCol = headers.findIndex(function(h) { return h.toString().toLowerCase().trim() === "ma_khang" || h.toString().toLowerCase() === "mã khách hàng" || h.toString().toLowerCase() === "mã khách" });
      if (maKhangCol === -1) maKhangCol = 2; // Default to col C (0-indexed 2)
      
      var trangThaiCol = headers.findIndex(function(h) { return h.toString().toLowerCase().trim() === "trạng thái" || h.toString().toLowerCase() === "trang_thai" });
      if(trangThaiCol === -1) trangThaiCol = 8; // Default to col I (0-indexed 8)
      
      var updated = false;
      if (lastRow > 1) {
        var maKhangData = sheet.getRange(2, maKhangCol + 1, lastRow - 1, 1).getValues();
        for(var i = 0; i < maKhangData.length; i++){
          if(maKhangData[i][0] && maKhangData[i][0].toString().trim() === data.maKhang.toString().trim()){
            sheet.getRange(i+2, trangThaiCol+1).setValue(data.trangThai);
            updated = true;
          }
        }
      }
      
      if (updated) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Updated Status" })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Ma Khang not found" })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    if (action === "updateGroupBatch" || action === "updateGroup") {
      var sheet = ss.getSheetByName('ChiaNhom');
      if(!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Sheet ChiaNhom not found" })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var lastRow = sheet.getLastRow();
      var lastCol = Math.max(sheet.getLastColumn(), 7); // Ensure at least 7 columns
      
      var headers = [];
      if (lastRow === 0) {
        headers = ["STT", "MA_KHANG", "TEN_KHANG", "NHÓM", "MA_SOGCS", "DOANHSO", "DCHI_KHANG"];
        sheet.appendRow(headers);
        lastRow = 1;
        lastCol = headers.length;
      } else {
        headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      }
      
      var sttCol = headers.findIndex(function(h) { return h.toString().toLowerCase().trim() === "stt" });
      var maKhangCol = headers.findIndex(function(h) { return h.toString().toLowerCase().trim() === "ma_khang" || h.toString().toLowerCase() === "mã khách hàng" || h.toString().toLowerCase() === "mã khách" });
      if (maKhangCol === -1) maKhangCol = 1;
      
      var nhomCol = headers.findIndex(function(h) { return h.toString().toLowerCase().trim() === "nhóm" || h.toString().toLowerCase() === "nhom" || h.toString().toLowerCase() === "tên nhóm" });
      if(nhomCol === -1) nhomCol = 3;
      
      var tenKhangCol = headers.findIndex(function(h) { return h.toString().toLowerCase().trim() === "tên khách hàng" || h.toString().toLowerCase() === "ten_khang" || h.toString().toLowerCase() === "tên khách" });
      var maSoGcsCol = headers.findIndex(function(h) { return h.toString().toLowerCase().trim() === "mã sổ gcs" || h.toString().toLowerCase() === "ma_sogcs" });
      var danhSoCol = headers.findIndex(function(h) { return h.toString().toLowerCase().trim() === "doanh số" || h.toString().toLowerCase() === "danhso" || h.toString().toLowerCase() === "doanh so" });
      var diaChiCol = headers.findIndex(function(h) { return h.toString().toLowerCase().trim() === "địa chỉ" || h.toString().toLowerCase() === "dchi_khang" || h.toString().toLowerCase() === "dia chi" });

      var updates = action === "updateGroupBatch" ? data.updates : [data];
      var updatedCount = 0;
      var rowsToAppend = [];
      
      if (lastRow > 1) {
        // Tối ưu hóa: Chỉ đọc cột MA_KHANG
        var maKhangData = sheet.getRange(2, maKhangCol + 1, lastRow - 1, 1).getValues();
        var maKhangToIndex = {};
        for(var i = 0; i < maKhangData.length; i++) {
          if(maKhangData[i][0] !== undefined && maKhangData[i][0] !== null && maKhangData[i][0] !== "") {
            maKhangToIndex[maKhangData[i][0].toString().trim()] = i + 2;
          }
        }
        
        var updatesByRow = {};
        for (var j = 0; j < updates.length; j++) {
          var update = updates[j];
          var mk = update.maKhang !== undefined && update.maKhang !== null ? update.maKhang.toString().trim() : "";
          if (mk === "") continue;
          
          if (maKhangToIndex.hasOwnProperty(mk)) {
            updatesByRow[maKhangToIndex[mk]] = update.newGroup;
            updatedCount++;
          } else {
            var newRow = new Array(Math.max(headers.length, 7)).fill("");
            if (sttCol !== -1) {
               newRow[sttCol] = lastRow === 0 ? 1 + rowsToAppend.length : lastRow + rowsToAppend.length;
            }
            newRow[maKhangCol] = update.maKhang;
            newRow[nhomCol] = update.newGroup;
            if (tenKhangCol !== -1 && update.tenKhang) newRow[tenKhangCol] = update.tenKhang;
            if (maSoGcsCol !== -1 && update.maSoGcs) newRow[maSoGcsCol] = update.maSoGcs;
            if (danhSoCol !== -1 && update.danhSo) newRow[danhSoCol] = update.danhSo;
            if (diaChiCol !== -1 && update.diaChi) newRow[diaChiCol] = update.diaChi;
            
            rowsToAppend.push(newRow);
            updatedCount++;
          }
        }
        
        var rowsToUpdate = Object.keys(updatesByRow).map(Number);
        if (rowsToUpdate.length > 0) {
           var groups = {};
           for (var r = 0; r < rowsToUpdate.length; r++) {
              var rowIndex = rowsToUpdate[r];
              var groupVal = updatesByRow[rowIndex];
              if (!groups[groupVal]) groups[groupVal] = [];
              groups[groupVal].push(rowIndex);
           }
           
           var nColLetter = getColLetter(nhomCol + 1);
           
           for (var g in groups) {
              var rowIndices = groups[g];
              // Split into chunks of 400 to avoid RangeList limit
              var maxRanges = 400;
              for (var idx = 0; idx < rowIndices.length; idx += maxRanges) {
                 var chunk = rowIndices.slice(idx, idx + maxRanges);
                 var ranges = chunk.map(function(rIndex) { return nColLetter + rIndex; });
                 sheet.getRangeList(ranges).setValue(g);
              }
           }
        }
      } else {
        for (var j = 0; j < updates.length; j++) {
          var update = updates[j];
          var newRow = new Array(Math.max(headers.length, 7)).fill("");
          if (sttCol !== -1) {
             newRow[sttCol] = rowsToAppend.length + 1;
          }
          newRow[maKhangCol] = update.maKhang;
          newRow[nhomCol] = update.newGroup;
          if (tenKhangCol !== -1 && update.tenKhang) newRow[tenKhangCol] = update.tenKhang;
          if (maSoGcsCol !== -1 && update.maSoGcs) newRow[maSoGcsCol] = update.maSoGcs;
          if (danhSoCol !== -1 && update.danhSo) newRow[danhSoCol] = update.danhSo;
          if (diaChiCol !== -1 && update.diaChi) newRow[diaChiCol] = update.diaChi;
          
          rowsToAppend.push(newRow);
          updatedCount++;
        }
      }
      
      if (rowsToAppend.length > 0) {
        sheet.getRange(lastRow + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Updated " + updatedCount + " groups" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ... [Omitted updateLinkDL and updatePass for brevity, wait I should include them to keep the file complete]
    if (action === "updateLinkDL") {
      var sheet = ss.getSheetByName(sheetName);
      if(!sheet) return ContentService.createTextOutput("Sheet not found");
      
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow <= 1) return ContentService.createTextOutput("Sheet is empty");
      
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var maDVCol = headers.findIndex(function(h) { return h.toString().toLowerCase().trim() === data.maDV.toString().toLowerCase().trim() || h.toString().toLowerCase() === "mã đv" || h.toString().toLowerCase() === "ma_dv" });
      if (maDVCol === -1) maDVCol = 1;
      
      var linkDLCol = headers.findIndex(function(h) { return h.toString().toLowerCase().trim() === "link dl" || h.toString().toLowerCase() === "link_dl" });
      if(linkDLCol === -1) linkDLCol = 3;
      
      var maDVData = sheet.getRange(2, maDVCol + 1, lastRow - 1, 1).getValues();
      for(var i = 0; i < maDVData.length; i++){
        if(maDVData[i][0] && maDVData[i][0].toString().toLowerCase() === data.maDV.toLowerCase()){
          sheet.getRange(i+2, linkDLCol+1).setValue(data["Link DL"]);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Updated Link" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "updatePass") {
      var sheet = ss.getSheetByName(sheetName);
      if(!sheet) return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Sheet not found: " + sheetName })).setMimeType(ContentService.MimeType.JSON);
      
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow <= 1) return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Sheet is empty" })).setMimeType(ContentService.MimeType.JSON);
      
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      
      // Target key to match: nhom or maDV
      var targetKey = (data.nhom || data.maDV || data.username || "").toString().replace(/\s+/g, "").toLowerCase();
      
      var keyCol = headers.findIndex(function(h) { 
        var str = h.toString().toLowerCase().trim();
        return str === "nhóm" || str === "nhom" || str === "tên nhóm" || str === "mã đv" || str === "ma_dv" || str === "mã đơn vị";
      });
      if (keyCol === -1) keyCol = 1; 
      
      var passCol = headers.findIndex(function(h) { 
        var str = h.toString().toLowerCase().trim();
        return str === "matkhau" || str === "mật khẩu" || str === "mat_khau" || str === "pass" || str === "password";
      });
      if(passCol === -1) {
        passCol = (sheetName && sheetName.toLowerCase() === "khuvuc") ? 3 : 5;
      }
      
      var colData = sheet.getRange(2, keyCol + 1, lastRow - 1, 1).getValues();
      var updated = false;
      for(var i = 0; i < colData.length; i++){
        var cellVal = colData[i][0] ? colData[i][0].toString().replace(/\s+/g, "").toLowerCase() : "";
        if(cellVal === targetKey){
          sheet.getRange(i + 2, passCol + 1).setValue(data.newPass);
          updated = true;
          break;
        }
      }
      
      if (updated) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Updated Pass" })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Record not found: " + targetKey })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Unknown action" })).setMimeType(ContentService.MimeType.JSON);
  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": e.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
